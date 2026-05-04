/**
 * RuntimeClient — connects the Web Component shell to the runtime over SSE + WebSocket
 * (per ADR-038).
 *
 *   • Opens an SSE EventSource to {runtimeUrl}/sse and dispatches `layout` events to onLayout.
 *   • Opens a WebSocket to {runtimeUrl}/ws and serves as the shell's EmitTransport.
 *
 * EventSource and WebSocket constructors are injectable for testing (and for SSR/Node embedding).
 */

import {
  ERROR_CATEGORIES,
  type ComposedLayout,
  type EmitTransport,
  type ErrorEnvelope,
  type InstructionEnvelope,
} from '@saasagent/protocol';

export type EventSourceCtor = new (url: string, init?: EventSourceInit) => EventSource;
export type WebSocketCtor = new (url: string | URL, protocols?: string | string[]) => WebSocket;

export interface RuntimeClientOptions {
  /** Base URL of the runtime, e.g. "http://localhost:8080". */
  runtimeUrl: string;
  /** Called when a new ComposedLayout arrives over SSE. */
  onLayout: (layout: ComposedLayout) => void;
  /** Called when the runtime sends an ErrorEnvelope (composer/planner/etc. failure). */
  onServerError?: (envelope: ErrorEnvelope) => void;
  /** Called on transport-level errors (SSE connection error, WS close, parse failures). */
  onError?: (err: Error) => void;
  /** Override EventSource constructor (test injection). */
  EventSourceCtor?: EventSourceCtor;
  /** Override WebSocket constructor (test injection). */
  WebSocketCtor?: WebSocketCtor;
}

export class RuntimeClient implements EmitTransport {
  private sse: EventSource | null = null;
  private ws: WebSocket | null = null;
  private readonly pendingEmits: InstructionEnvelope[] = [];
  private wsOpen = false;

  constructor(private readonly options: RuntimeClientOptions) {}

  connect(): void {
    const ESCtor: EventSourceCtor =
      this.options.EventSourceCtor ?? (globalThis as { EventSource?: EventSourceCtor }).EventSource!;
    const WSCtor: WebSocketCtor =
      this.options.WebSocketCtor ?? (globalThis as { WebSocket?: WebSocketCtor }).WebSocket!;

    if (!ESCtor) throw new Error('No EventSource available; pass EventSourceCtor in options.');
    if (!WSCtor) throw new Error('No WebSocket available; pass WebSocketCtor in options.');

    const sseUrl = `${this.options.runtimeUrl.replace(/\/$/, '')}/sse`;
    const wsUrl = `${this.options.runtimeUrl.replace(/\/$/, '').replace(/^http/, 'ws')}/ws`;

    this.sse = new ESCtor(sseUrl);
    this.sse.addEventListener('layout', (e) => {
      try {
        const layout = JSON.parse((e as MessageEvent).data) as ComposedLayout;
        this.options.onLayout(layout);
      } catch (err) {
        this.options.onError?.(err as Error);
      }
    });
    // Server-emitted error events use specific category names (composer-error,
    // planner-error, …) rather than 'error' to avoid colliding with EventSource's
    // native error event (connection-level, no .data).
    for (const category of ERROR_CATEGORIES) {
      this.sse.addEventListener(category, (e) => {
        try {
          const envelope = JSON.parse((e as MessageEvent).data) as ErrorEnvelope;
          this.options.onServerError?.(envelope);
        } catch (err) {
          this.options.onError?.(err as Error);
        }
      });
    }
    this.sse.onerror = () => {
      this.options.onError?.(new Error('SSE connection error'));
    };

    this.ws = new WSCtor(wsUrl);
    this.ws.addEventListener('open', () => {
      this.wsOpen = true;
      // Flush any envelopes queued before the socket opened.
      while (this.pendingEmits.length > 0 && this.ws && this.wsOpen) {
        const env = this.pendingEmits.shift()!;
        this.ws.send(JSON.stringify(env));
      }
    });
    this.ws.addEventListener('close', () => {
      this.wsOpen = false;
    });
    this.ws.addEventListener('error', () => {
      this.options.onError?.(new Error('WebSocket error'));
    });
  }

  disconnect(): void {
    this.sse?.close();
    this.sse = null;
    this.ws?.close();
    this.ws = null;
    this.wsOpen = false;
    this.pendingEmits.length = 0;
  }

  /** EmitTransport implementation — buffers if WS not yet open. */
  send(envelope: InstructionEnvelope): void {
    if (this.ws && this.wsOpen) {
      this.ws.send(JSON.stringify(envelope));
    } else {
      this.pendingEmits.push(envelope);
    }
  }
}
