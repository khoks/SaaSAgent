/**
 * KafkaEventStream — Phase 5 (ADR-008).
 *
 * Adapter against any kafkajs-compatible producer/consumer. The runtime
 * package doesn't hard-depend on kafkajs (host opts in by passing the client);
 * for tests we use a stubbed client matching the same shape.
 *
 * Wire format — each runtime event is published as a Kafka message:
 *   • topic  = event.topic
 *   • key    = event.key (when set) for partition affinity
 *   • value  = JSON.stringify({ payload, at })
 *
 * Consumers (subscribe()) run a per-topic kafkajs Consumer with auto-commit;
 * each delivered message is parsed back into a RuntimeEvent and dispatched
 * to all registered handlers.
 */

import type { EventHandler, EventStream, RuntimeEvent } from './types.js';

/** Minimal contract any kafkajs-compatible producer satisfies. */
export interface KafkaProducer {
  send(args: {
    topic: string;
    messages: Array<{ key?: string | Buffer | null; value: string | Buffer | null }>;
  }): Promise<unknown>;
  disconnect?(): Promise<void>;
}

/** Minimal consumer contract — we attach via the eachMessage/run pattern. */
export interface KafkaConsumer {
  subscribe(args: { topic: string }): Promise<void>;
  run(args: {
    eachMessage: (payload: {
      topic: string;
      partition: number;
      message: { key: Buffer | null; value: Buffer | null };
    }) => Promise<void>;
  }): Promise<void>;
  disconnect?(): Promise<void>;
}

export interface KafkaEventStreamOptions {
  /** Producer — the host wires this up via kafkajs. */
  producer: KafkaProducer;
  /**
   * Factory that returns a fresh Consumer per subscribe() call. Each subscribe
   * spawns its own consumer (group/topic isolated). Optional — when not
   * provided, subscribe() throws.
   */
  consumerFactory?: () => KafkaConsumer;
}

export class KafkaEventStream implements EventStream {
  readonly name = 'kafka';
  private readonly producer: KafkaProducer;
  private readonly consumerFactory: (() => KafkaConsumer) | undefined;
  private readonly consumers: KafkaConsumer[] = [];

  constructor(opts: KafkaEventStreamOptions) {
    this.producer = opts.producer;
    if (opts.consumerFactory) this.consumerFactory = opts.consumerFactory;
  }

  async publish(event: RuntimeEvent): Promise<void> {
    const stamped: RuntimeEvent = { ...event, at: event.at ?? new Date().toISOString() };
    await this.producer.send({
      topic: event.topic,
      messages: [
        {
          ...(stamped.key ? { key: stamped.key } : {}),
          value: JSON.stringify({ payload: stamped.payload, at: stamped.at, key: stamped.key }),
        },
      ],
    });
  }

  subscribe(topic: string, handler: EventHandler): () => void {
    if (!this.consumerFactory) {
      throw new Error('KafkaEventStream.subscribe requires a consumerFactory in options');
    }
    const consumer = this.consumerFactory();
    this.consumers.push(consumer);
    void (async () => {
      await consumer.subscribe({ topic });
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          const text = message.value.toString('utf-8');
          let parsed: { payload: unknown; at?: string; key?: string };
          try {
            parsed = JSON.parse(text);
          } catch {
            return;
          }
          const event: RuntimeEvent = {
            topic,
            payload: parsed.payload,
            ...(parsed.at ? { at: parsed.at } : {}),
            ...(parsed.key ? { key: parsed.key } : {}),
          };
          await handler(event);
        },
      });
    })().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(`[kafka-events] consumer for ${topic} failed:`, err);
    });
    return () => {
      void consumer.disconnect?.().catch(() => undefined);
    };
  }

  async close(): Promise<void> {
    await this.producer.disconnect?.().catch(() => undefined);
    for (const c of this.consumers) {
      await c.disconnect?.().catch(() => undefined);
    }
  }
}
