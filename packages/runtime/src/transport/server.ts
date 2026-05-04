/**
 * RuntimeServer — Node HTTP server that exposes the runtime's wire protocol.
 *
 * Per ADR-038:
 *   • GET  /sse    — Server-Sent Events stream of ComposedLayouts (and status/narration).
 *   • WS   /ws     — bidirectional channel; shell sends InstructionEnvelopes.
 *   • GET  /health — liveness probe.
 *
 * The current implementation auto-composes a "welcome" layout when an SSE client
 * connects, and re-composes on every InstructionEnvelope received via WS, fan-out
 * to all connected SSE clients. Real planner integration lands in Phase 2.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { AddressInfo } from 'node:net';

import { WebSocketServer, type WebSocket } from 'ws';

import type {
  AtomicComponent,
  ComposedLayout,
  ComposeContext,
  ErrorEnvelope,
  InstructionEnvelope,
  UIComposer,
} from '@saasagent/protocol';

import { ProviderError } from '../model/types.js';
import {
  type ComponentRegistryStore,
  InMemoryComponentRegistry,
} from '../registry/index.js';

import { formatSSEMessage, SSE_HEADERS, SSE_PREAMBLE } from './sse.js';

export interface RuntimeServerOptions {
  /** Port to listen on. 0 = OS-assigned (useful for tests). */
  port: number;
  /** Composer to invoke on connect / instruction. */
  composer: UIComposer;
  /** Atomic UI Components registry store. Defaults to a fresh InMemoryComponentRegistry. */
  componentRegistry?: ComponentRegistryStore;
  /** Hook for tests / observability. */
  onInstruction?: (envelope: InstructionEnvelope) => void;
  /** Hook for tests / observability. */
  onSSEConnect?: () => void;
  /** Hook for tests / observability. */
  onWSConnect?: () => void;
}

/** CORS headers applied to every JSON / control-plane response. SSE endpoint adds them in SSE_HEADERS. */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const DEFAULT_THEME = { name: 'default', version: '0.0.0', tokens: {} } as const;

export class RuntimeServer {
  private readonly httpServer: Server;
  private readonly wss: WebSocketServer;
  private readonly sseClients = new Set<ServerResponse>();
  private readonly componentRegistry: ComponentRegistryStore;
  private actualPort: number = 0;

  constructor(private readonly options: RuntimeServerOptions) {
    this.componentRegistry = options.componentRegistry ?? new InMemoryComponentRegistry();
    this.httpServer = createServer((req, res) => {
      this.handleRequest(req, res).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[runtime] request handler error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('internal server error');
        }
      });
    });
    this.wss = new WebSocketServer({ noServer: true });
    this.httpServer.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));
    this.wss.on('connection', (ws) => this.handleWsConnection(ws));
  }

  /** Start listening. Resolves once bound. */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(this.options.port, () => {
        const addr = this.httpServer.address() as AddressInfo;
        this.actualPort = addr.port;
        resolve();
      });
    });
  }

  /** The port the server is actually listening on (resolved if port=0 was passed). */
  get port(): number {
    return this.actualPort;
  }

  /** Stop listening, close all SSE clients and WS connections. */
  async stop(): Promise<void> {
    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        /* ignore */
      }
    }
    this.sseClients.clear();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
  }

  /** Push a layout to every connected SSE client. */
  broadcastLayout(layout: ComposedLayout): void {
    const wire = formatSSEMessage({ event: 'layout', data: layout, id: layout.composeCycleId });
    for (const client of this.sseClients) {
      try {
        client.write(wire);
      } catch {
        // client may have disconnected mid-write; will be removed on close handler
      }
    }
  }

  /** Push an ErrorEnvelope to every connected SSE client. */
  broadcastError(envelope: ErrorEnvelope): void {
    const wire = formatSSEMessage({
      event: envelope.category,
      data: envelope,
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    for (const client of this.sseClients) {
      try {
        client.write(wire);
      } catch {
        // ignore — connection closed
      }
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';

    // CORS preflight — answer all OPTIONS uniformly.
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (url === '/health') {
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          sseClients: this.sseClients.size,
          componentRegistryVersion: this.componentRegistry.get().version,
          componentCount: Object.keys(this.componentRegistry.get().components).length,
        }),
      );
      return;
    }

    // Atomic UI Components registry endpoints.
    if (url === '/registry/components') {
      if (req.method === 'GET') {
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.componentRegistry.get()));
        return;
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const components = Array.isArray(body)
          ? (body as ReadonlyArray<AtomicComponent>)
          : ((body as { components?: ReadonlyArray<AtomicComponent> })?.components ?? []);
        const updated = this.componentRegistry.replace(components);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === 'POST') {
        const body = (await readJsonBody(req)) as AtomicComponent;
        if (!body?.name) {
          res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'POST body must be an AtomicComponent with a name field' }));
          return;
        }
        const updated = this.componentRegistry.upsert(body);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === 'DELETE') {
        const updated = this.componentRegistry.clear();
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
    }

    if (url === '/sse' && req.method === 'GET') {
      res.writeHead(200, SSE_HEADERS);
      res.write(SSE_PREAMBLE);
      this.sseClients.add(res);
      this.options.onSSEConnect?.();
      req.on('close', () => this.sseClients.delete(res));

      // Auto-emit a welcome layout so the shell has something to render immediately.
      try {
        const layout = await this.options.composer.compose('welcome', this.buildContext('welcome'));
        res.write(formatSSEMessage({ event: 'layout', data: layout, id: layout.composeCycleId }));
      } catch (err) {
        const envelope = buildErrorEnvelope(err);
        res.write(
          formatSSEMessage({
            event: envelope.category,
            data: envelope,
            id: `err-${Date.now()}`,
          }),
        );
      }
      return;
    }

    res.writeHead(404, { ...CORS_HEADERS, 'Content-Type': 'text/plain' });
    res.end('not found');
  }

  private buildContext(intent: string): ComposeContext {
    return {
      components: this.componentRegistry.get(),
      theme: DEFAULT_THEME,
      conversationContext: { intent },
    };
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (req.url === '/ws') {
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  }

  private handleWsConnection(ws: WebSocket): void {
    this.options.onWSConnect?.();
    ws.on('message', (raw: Buffer) => {
      let envelope: InstructionEnvelope;
      try {
        envelope = JSON.parse(raw.toString('utf-8')) as InstructionEnvelope;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[runtime] received malformed WS message:', err);
        return;
      }
      this.options.onInstruction?.(envelope);
      // Re-compose in response to the user's interaction. Phase 2 will route this
      // through the planner; Phase 1.x routes directly to composer with envelope.type as intent.
      this.options.composer
        .compose(envelope.type, this.buildContext(envelope.type))
        .then((layout) => this.broadcastLayout(layout))
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[runtime] re-compose failed:', err);
          this.broadcastError(buildErrorEnvelope(err, envelope.composeCycleId));
        });
    });
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (raw.length === 0) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed JSON body: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Translate a thrown error into a typed-JSON ErrorEnvelope the shell can render.
 * ProviderError carries an explicit retryable flag; generic errors are conservatively
 * marked non-retryable so the shell doesn't loop on permanent failures.
 */
function buildErrorEnvelope(err: unknown, composeCycleId?: string): ErrorEnvelope {
  const emittedAt = new Date().toISOString();
  if (err instanceof ProviderError) {
    return {
      category: 'composer-error',
      code: 'provider-error',
      message: err.message,
      retryable: err.retryable,
      emittedAt,
      composeCycleId,
    };
  }
  if (err instanceof Error) {
    return {
      category: 'composer-error',
      code: 'compose-failed',
      message: err.message,
      retryable: false,
      emittedAt,
      composeCycleId,
    };
  }
  return {
    category: 'unknown-error',
    code: 'unknown',
    message: String(err),
    retryable: false,
    emittedAt,
    composeCycleId,
  };
}
