import { describe, it, expect, vi } from 'vitest';
import { InMemoryEventStream } from './in-memory.js';
import { KafkaEventStream, type KafkaProducer, type KafkaConsumer } from './kafka.js';
import { RuntimeTopics } from './types.js';

describe('InMemoryEventStream', () => {
  it('reports its name', () => {
    expect(new InMemoryEventStream().name).toBe('in-memory');
  });

  it('delivers published events to subscribers', async () => {
    const bus = new InMemoryEventStream();
    const calls: unknown[] = [];
    bus.subscribe('topic-a', (e) => calls.push(e.payload));
    await bus.publish({ topic: 'topic-a', payload: { x: 1 } });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toEqual([{ x: 1 }]);
  });

  it('fan-outs to multiple subscribers', async () => {
    const bus = new InMemoryEventStream();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe('topic', a);
    bus.subscribe('topic', b);
    await bus.publish({ topic: 'topic', payload: 'hi' });
    await new Promise((r) => setTimeout(r, 10));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not deliver to unrelated topics', async () => {
    const bus = new InMemoryEventStream();
    const seen = vi.fn();
    bus.subscribe('important', seen);
    await bus.publish({ topic: 'other', payload: 'meh' });
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).not.toHaveBeenCalled();
  });

  it('disposer detaches the subscriber', async () => {
    const bus = new InMemoryEventStream();
    const seen = vi.fn();
    const dispose = bus.subscribe('t', seen);
    dispose();
    await bus.publish({ topic: 't', payload: 1 });
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).not.toHaveBeenCalled();
  });

  it('isolates handler errors (one throwing handler does not block others)', async () => {
    const bus = new InMemoryEventStream();
    const ok = vi.fn();
    bus.subscribe('t', () => {
      throw new Error('boom');
    });
    bus.subscribe('t', ok);
    await bus.publish({ topic: 't', payload: 1 });
    await new Promise((r) => setTimeout(r, 10));
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('stamps `at` with current ISO time when missing', async () => {
    const bus = new InMemoryEventStream();
    let received = '';
    bus.subscribe('t', (e) => {
      received = e.at ?? '';
    });
    await bus.publish({ topic: 't', payload: null });
    await new Promise((r) => setTimeout(r, 10));
    expect(received).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('exports canonical topic names', () => {
    expect(RuntimeTopics.PlanCompleted).toBe('saasagent.plan.completed');
    expect(RuntimeTopics.EvalSignal).toBe('saasagent.eval.signal');
  });
});

describe('KafkaEventStream', () => {
  it('reports its name', () => {
    const stub: KafkaProducer = { send: async () => undefined };
    expect(new KafkaEventStream({ producer: stub }).name).toBe('kafka');
  });

  it('publishes a message with topic + JSON-stringified payload', async () => {
    const sent: Array<{ topic: string; key?: unknown; value: string }> = [];
    const stub: KafkaProducer = {
      send: async ({ topic, messages }) => {
        for (const m of messages) {
          sent.push({ topic, key: m.key as unknown, value: String(m.value) });
        }
      },
    };
    const bus = new KafkaEventStream({ producer: stub });
    await bus.publish({ topic: 'saasagent.layout.broadcast', payload: { intent: 'x' }, key: 'sess-1' });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.topic).toBe('saasagent.layout.broadcast');
    expect(sent[0]!.key).toBe('sess-1');
    const parsed = JSON.parse(sent[0]!.value);
    expect(parsed.payload).toEqual({ intent: 'x' });
    expect(parsed.at).toBeTruthy();
    expect(parsed.key).toBe('sess-1');
  });

  it('publish stamps `at` when missing', async () => {
    let captured = '';
    const stub: KafkaProducer = {
      send: async ({ messages }) => {
        captured = String(messages[0]!.value);
      },
    };
    const bus = new KafkaEventStream({ producer: stub });
    await bus.publish({ topic: 't', payload: null });
    expect(JSON.parse(captured).at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('subscribe wires up a consumer; eachMessage parses + dispatches', async () => {
    const handlers: Array<(p: { topic: string; partition: number; message: { key: Buffer | null; value: Buffer | null } }) => Promise<void>> = [];
    const consumer: KafkaConsumer = {
      subscribe: async () => undefined,
      run: async ({ eachMessage }) => {
        handlers.push(eachMessage);
      },
    };
    const stub: KafkaProducer = { send: async () => undefined };
    const bus = new KafkaEventStream({
      producer: stub,
      consumerFactory: () => consumer,
    });
    const seen: unknown[] = [];
    bus.subscribe('t', (e) => seen.push(e.payload));
    // Wait for the async subscribe/run setup to complete.
    await new Promise((r) => setTimeout(r, 5));
    expect(handlers).toHaveLength(1);
    await handlers[0]!({
      topic: 't',
      partition: 0,
      message: {
        key: null,
        value: Buffer.from(JSON.stringify({ payload: { hello: 'world' }, at: '2026-01-01T00:00:00Z' })),
      },
    });
    expect(seen).toEqual([{ hello: 'world' }]);
  });

  it('subscribe throws when no consumerFactory is configured', () => {
    const stub: KafkaProducer = { send: async () => undefined };
    const bus = new KafkaEventStream({ producer: stub });
    expect(() => bus.subscribe('t', () => undefined)).toThrow(/consumerFactory/);
  });

  it('close() disconnects producer + all consumers', async () => {
    const producerDisconnect = vi.fn(async () => undefined);
    const consumerDisconnect = vi.fn(async () => undefined);
    const stub: KafkaProducer = { send: async () => undefined, disconnect: producerDisconnect };
    const consumer: KafkaConsumer = {
      subscribe: async () => undefined,
      run: async () => undefined,
      disconnect: consumerDisconnect,
    };
    const bus = new KafkaEventStream({
      producer: stub,
      consumerFactory: () => consumer,
    });
    bus.subscribe('t', () => undefined);
    await new Promise((r) => setTimeout(r, 5));
    await bus.close();
    expect(producerDisconnect).toHaveBeenCalledTimes(1);
    expect(consumerDisconnect).toHaveBeenCalledTimes(1);
  });
});
