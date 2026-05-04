// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ComposedLayout,
  ErrorEnvelope,
  InstructionEnvelope,
} from '@saasagent/protocol';
import { RuntimeClient, type EventSourceCtor, type WebSocketCtor } from './client.js';

/**
 * Mock EventSource that lets tests fire `layout` events on demand.
 */
class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = [];
  url: string;
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
  constructor(url: string) {
    super();
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  close(): void {
    /* noop */
  }
  emitLayout(layout: ComposedLayout): void {
    this.dispatchEvent(new MessageEvent('layout', { data: JSON.stringify(layout) }));
  }
  emitServerError(envelope: ErrorEnvelope): void {
    this.dispatchEvent(new MessageEvent(envelope.category, { data: JSON.stringify(envelope) }));
  }
  fireError(): void {
    this.onerror?.call(this as unknown as EventSource, new Event('error'));
  }
}

/**
 * Mock WebSocket that captures sent payloads and lets tests control open/close lifecycle.
 */
class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = [];
  url: string;
  sent: string[] = [];
  readyState = 0; // CONNECTING
  constructor(url: string) {
    super();
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3; // CLOSED
    this.dispatchEvent(new Event('close'));
  }
  open(): void {
    this.readyState = 1; // OPEN
    this.dispatchEvent(new Event('open'));
  }
}

describe('RuntimeClient', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    FakeWebSocket.instances = [];
  });

  function makeClient(
    received: ComposedLayout[] = [],
    errors: Error[] = [],
    serverErrors: ErrorEnvelope[] = [],
  ) {
    const client = new RuntimeClient({
      runtimeUrl: 'http://localhost:8080',
      onLayout: (l) => received.push(l),
      onServerError: (e) => serverErrors.push(e),
      onError: (e) => errors.push(e),
      EventSourceCtor: FakeEventSource as unknown as EventSourceCtor,
      WebSocketCtor: FakeWebSocket as unknown as WebSocketCtor,
    });
    return { client, received, errors, serverErrors };
  }

  it('connects to /sse and /ws on the configured runtime URL', () => {
    const { client } = makeClient();
    client.connect();
    expect(FakeEventSource.instances[0]?.url).toBe('http://localhost:8080/sse');
    expect(FakeWebSocket.instances[0]?.url).toBe('ws://localhost:8080/ws');
  });

  it('forwards SSE `layout` events to onLayout', () => {
    const { client, received } = makeClient();
    client.connect();
    const layout: ComposedLayout = {
      composeCycleId: 'cycle-1',
      composedAt: '2026-05-08T00:00:00Z',
      root: { id: 'root', component: 'Card' },
    };
    FakeEventSource.instances[0]!.emitLayout(layout);
    expect(received).toHaveLength(1);
    expect(received[0]?.composeCycleId).toBe('cycle-1');
  });

  it('buffers emits before WS opens, then flushes on open', () => {
    const { client } = makeClient();
    client.connect();
    const env: InstructionEnvelope = {
      composeCycleId: 'cycle-1',
      sourceNodeId: 'btn',
      emittedAt: '2026-05-08T00:00:01Z',
      type: 'click',
      sequence: 0,
    };
    client.send(env);
    // WS not open yet
    expect(FakeWebSocket.instances[0]?.sent).toHaveLength(0);
    // Open it
    FakeWebSocket.instances[0]!.open();
    expect(FakeWebSocket.instances[0]?.sent).toHaveLength(1);
    expect(JSON.parse(FakeWebSocket.instances[0]!.sent[0]!) as InstructionEnvelope).toMatchObject({
      composeCycleId: 'cycle-1',
      type: 'click',
    });
  });

  it('sends emits directly when WS is open', () => {
    const { client } = makeClient();
    client.connect();
    FakeWebSocket.instances[0]!.open();
    client.send({
      composeCycleId: 'c',
      sourceNodeId: 's',
      emittedAt: 'x',
      type: 't',
      sequence: 0,
    });
    expect(FakeWebSocket.instances[0]?.sent).toHaveLength(1);
  });

  it('reports SSE parse errors to onError', () => {
    const { client, errors } = makeClient();
    client.connect();
    FakeEventSource.instances[0]!.dispatchEvent(
      new MessageEvent('layout', { data: '{ not json' }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toMatch(/JSON/i);
  });

  it('disconnect clears state and prevents flush on a stale open event', () => {
    const { client } = makeClient();
    client.connect();
    client.disconnect();
    // Re-firing open on the orphaned fake should not blow up.
    expect(() => FakeWebSocket.instances[0]!.open()).not.toThrow();
  });

  it('forwards composer-error events to onServerError', () => {
    const { client, serverErrors } = makeClient();
    client.connect();
    const envelope: ErrorEnvelope = {
      category: 'composer-error',
      code: 'provider-error',
      message: 'API failure',
      retryable: true,
      emittedAt: '2026-05-08T00:00:00Z',
    };
    FakeEventSource.instances[0]!.emitServerError(envelope);
    expect(serverErrors).toHaveLength(1);
    expect(serverErrors[0]?.code).toBe('provider-error');
  });

  it('forwards unknown-error events to onServerError', () => {
    const { client, serverErrors } = makeClient();
    client.connect();
    const envelope: ErrorEnvelope = {
      category: 'unknown-error',
      code: 'unknown',
      message: 'something blew up',
      retryable: false,
      emittedAt: '2026-05-08T00:00:00Z',
    };
    FakeEventSource.instances[0]!.emitServerError(envelope);
    expect(serverErrors).toHaveLength(1);
    expect(serverErrors[0]?.category).toBe('unknown-error');
  });
});
