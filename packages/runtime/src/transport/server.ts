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
  ComposedToolInvocation,
  ErrorEnvelope,
  InstructionEnvelope,
  UIComposer,
} from '@saasagent/protocol';

import { ProviderError } from '../model/types.js';
import {
  type ComponentRegistryStore,
  type ThemeRegistryStore,
  type SkillRegistryStore,
  type ToolRegistryStore,
  type FeatureRegistryStore,
  InMemoryComponentRegistry,
  InMemoryThemeRegistry,
  InMemorySkillRegistry,
  InMemoryToolRegistry,
  InMemoryFeatureRegistry,
  importStyleDictionary,
  importCssVariables,
  importFeatureMarkdown,
} from '../registry/index.js';
import {
  SkillExecutor,
  ToolExecutor,
  type ExecutionErrorCode,
  type ExecutionResult,
} from '../executor/index.js';
import { type Planner, StubPlanner, type ToolInvocation } from '../planner/index.js';

import { formatSSEMessage, SSE_HEADERS, SSE_PREAMBLE } from './sse.js';

export interface RuntimeServerOptions {
  /** Port to listen on. 0 = OS-assigned (useful for tests). */
  port: number;
  /** Composer to invoke on connect / instruction. */
  composer: UIComposer;
  /** Atomic UI Components registry store. Defaults to a fresh InMemoryComponentRegistry. */
  componentRegistry?: ComponentRegistryStore;
  /** Theme & branding tokens registry store. Defaults to a fresh InMemoryThemeRegistry. */
  themeRegistry?: ThemeRegistryStore;
  /** Skills registry store (Phase 2.0b). Defaults to a fresh InMemorySkillRegistry. */
  skillRegistry?: SkillRegistryStore;
  /** Tools registry store (Phase 2.0b). Defaults to a fresh InMemoryToolRegistry. */
  toolRegistry?: ToolRegistryStore;
  /** Features registry store (Phase 2.2). Defaults to a fresh InMemoryFeatureRegistry. */
  featureRegistry?: FeatureRegistryStore;
  /**
   * SkillExecutor (Phase 2.0c). If omitted, the server constructs a default
   * SkillExecutor bound to its skillRegistry. Pass an explicit instance to
   * register handlers before start() (recommended path for host code).
   */
  skillExecutor?: SkillExecutor;
  /** ToolExecutor (Phase 2.0c). If omitted, the server constructs a default bound to its toolRegistry. */
  toolExecutor?: ToolExecutor;
  /**
   * Planner (Phase 2.1). Sits between the WS boundary and the composer; extracts
   * intent from envelopes and may invoke skills/tools before composing. Defaults
   * to StubPlanner (deterministic routing, no LLM).
   */
  planner?: Planner;
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


export class RuntimeServer {
  private readonly httpServer: Server;
  private readonly wss: WebSocketServer;
  private readonly sseClients = new Set<ServerResponse>();
  private readonly componentRegistry: ComponentRegistryStore;
  private readonly themeRegistry: ThemeRegistryStore;
  private readonly skillRegistry: SkillRegistryStore;
  private readonly toolRegistry: ToolRegistryStore;
  private readonly featureRegistry: FeatureRegistryStore;
  private readonly skillExecutor: SkillExecutor;
  private readonly toolExecutor: ToolExecutor;
  private readonly planner: Planner;
  private actualPort: number = 0;

  constructor(private readonly options: RuntimeServerOptions) {
    this.componentRegistry = options.componentRegistry ?? new InMemoryComponentRegistry();
    this.themeRegistry = options.themeRegistry ?? new InMemoryThemeRegistry();
    this.skillRegistry = options.skillRegistry ?? new InMemorySkillRegistry();
    this.toolRegistry = options.toolRegistry ?? new InMemoryToolRegistry();
    this.featureRegistry = options.featureRegistry ?? new InMemoryFeatureRegistry();
    this.skillExecutor = options.skillExecutor ?? new SkillExecutor({ registry: this.skillRegistry });
    this.toolExecutor = options.toolExecutor ?? new ToolExecutor({ registry: this.toolRegistry });
    this.planner = options.planner ?? new StubPlanner();
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
          themeName: this.themeRegistry.get().name,
          themeVersion: this.themeRegistry.get().version,
          skillRegistryVersion: this.skillRegistry.get().version,
          skillCount: Object.keys(this.skillRegistry.get().skills).length,
          toolRegistryVersion: this.toolRegistry.get().version,
          toolCount: Object.keys(this.toolRegistry.get().tools).length,
          featureRegistryVersion: this.featureRegistry.get().version,
          featureCount: Object.keys(this.featureRegistry.get().features).length,
        }),
      );
      return;
    }

    // Features registry endpoints (Phase 2.2).
    // PUT supports ?format=markdown for raw .feature.md upload (single feature),
    // otherwise expects a JSON array of FeatureDescriptor or { features: [...] }.
    if (url.startsWith('/registry/features')) {
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname === '/registry/features') {
        if (req.method === 'GET') {
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.featureRegistry.get()));
          return;
        }
        if (req.method === 'PUT') {
          const format = parsed.searchParams.get('format');
          if (format === 'markdown') {
            const md = await readTextBody(req);
            try {
              const feature = importFeatureMarkdown(md);
              const updated = this.featureRegistry.upsert(feature);
              res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
              res.end(JSON.stringify(updated));
            } catch (err) {
              res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: err instanceof Error ? err.message : String(err),
                }),
              );
            }
            return;
          }
          const body = await readJsonBody(req);
          const items = Array.isArray(body)
            ? body
            : ((body as { features?: unknown })?.features ?? []);
          const updated = this.featureRegistry.replace(items as never);
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
          return;
        }
        if (req.method === 'POST') {
          const body = (await readJsonBody(req)) as { name?: string };
          if (!body?.name) {
            res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'POST body must be a FeatureDescriptor with a name field' }));
            return;
          }
          const updated = this.featureRegistry.upsert(body as never);
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
          return;
        }
        if (req.method === 'DELETE') {
          const updated = this.featureRegistry.clear();
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
          return;
        }
      }
    }

    // Skills + Tools registries (Phase 2.0b). Same shape as components: GET / PUT / POST / DELETE.
    if (url === '/registry/skills' || url === '/registry/tools') {
      const isSkills = url === '/registry/skills';
      if (req.method === 'GET') {
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(isSkills ? this.skillRegistry.get() : this.toolRegistry.get()));
        return;
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const items = Array.isArray(body)
          ? body
          : ((body as Record<string, unknown> | null)?.[isSkills ? 'skills' : 'tools'] ?? []);
        const updated = isSkills
          ? this.skillRegistry.replace(items as never)
          : this.toolRegistry.replace(items as never);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === 'POST') {
        const body = (await readJsonBody(req)) as { name?: string };
        if (!body?.name) {
          res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `POST body must have a name field (${isSkills ? 'skill' : 'tool'})` }));
          return;
        }
        const updated = isSkills
          ? this.skillRegistry.upsert(body as never)
          : this.toolRegistry.upsert(body as never);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === 'DELETE') {
        const updated = isSkills ? this.skillRegistry.clear() : this.toolRegistry.clear();
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
    }

    // Executor endpoints (Phase 2.0c) — POST /executor/skill/<name> | POST /executor/tool/<name>.
    // Body is the input args (JSON object). Response is the wire-form ExecutionResult.
    // HTTP status maps to the error code so a basic curl/HTTP client can branch without parsing JSON
    // (planner in Phase 2.1 will use the JSON body directly).
    if (url.startsWith('/executor/skill/') || url.startsWith('/executor/tool/')) {
      const isSkill = url.startsWith('/executor/skill/');
      const parsed = new URL(url, 'http://localhost');
      const prefix = isSkill ? '/executor/skill/' : '/executor/tool/';
      const name = decodeURIComponent(parsed.pathname.slice(prefix.length));
      if (!name) {
        res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: `name required: POST /executor/${isSkill ? 'skill' : 'tool'}/<name>`,
          }),
        );
        return;
      }
      if (req.method !== 'POST') {
        res.writeHead(405, { ...CORS_HEADERS, 'Content-Type': 'text/plain', Allow: 'POST' });
        res.end('method not allowed; use POST');
        return;
      }
      const body = await readJsonBody(req);
      const input = body ?? {};
      const result: ExecutionResult = isSkill
        ? await this.skillExecutor.execute(name, input)
        : await this.toolExecutor.execute(name, input);
      const status = result.ok ? 200 : executorErrorToHttpStatus(result.error.code);
      // Strip non-serializable `cause` from the wire response (Error instances etc).
      const wire = result.ok
        ? result
        : { ok: false, durationMs: result.durationMs, error: { code: result.error.code, message: result.error.message, ...(result.error.status !== undefined ? { status: result.error.status } : {}) } };
      res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(wire));
      return;
    }

    // Theme registry endpoints. PUT supports ?format=dtcg (default) | style-dictionary | css-variables.
    if (url.startsWith('/registry/theme')) {
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname === '/registry/theme') {
        if (req.method === 'GET') {
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.themeRegistry.get()));
          return;
        }
        if (req.method === 'PUT') {
          const format = parsed.searchParams.get('format') ?? 'dtcg';
          const updated = await this.handleThemePut(req, res, format, parsed.searchParams);
          if (updated) {
            res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
            res.end(JSON.stringify(updated));
          }
          return;
        }
        if (req.method === 'DELETE') {
          const cleared = this.themeRegistry.clear();
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(cleared));
          return;
        }
      }
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
      theme: this.themeRegistry.get(),
      conversationContext: { intent },
    };
  }

  /**
   * Handle PUT /registry/theme for the supported import formats.
   * Returns the updated theme on success, or `null` after writing a 4xx response on bad input.
   */
  private async handleThemePut(
    req: IncomingMessage,
    res: ServerResponse,
    format: string,
    qs: URLSearchParams,
  ): Promise<ReturnType<ThemeRegistryStore['replace']> | null> {
    if (format === 'style-dictionary') {
      const body = (await readJsonBody(req)) as
        | { name?: string; description?: string; tokens?: Record<string, unknown> }
        | Record<string, unknown>
        | null;
      const sdTokens =
        body && typeof body === 'object' && 'tokens' in body ? body.tokens : body;
      const tokens = importStyleDictionary(sdTokens);
      const name =
        qs.get('name') ??
        (body && typeof body === 'object' && 'name' in body && typeof body.name === 'string'
          ? body.name
          : 'imported-style-dictionary');
      const description =
        body && typeof body === 'object' && 'description' in body && typeof body.description === 'string'
          ? body.description
          : undefined;
      return this.themeRegistry.replace({ name, description, tokens });
    }

    if (format === 'css-variables') {
      const css = await readTextBody(req);
      const tokens = importCssVariables(css);
      const name = qs.get('name') ?? 'imported-css-variables';
      return this.themeRegistry.replace({ name, tokens });
    }

    // Default: DTCG canonical body { name, description?, tokens }.
    const body = (await readJsonBody(req)) as {
      name?: string;
      description?: string;
      tokens?: Record<string, unknown>;
    } | null;
    if (!body || typeof body.name !== 'string' || !body.tokens) {
      res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error:
            'PUT body must be { name: string, tokens: DTCGTokenGroup, description?: string } when no format query param is set, or use ?format=style-dictionary | css-variables for non-DTCG input',
        }),
      );
      return null;
    }
    return this.themeRegistry.replace({
      name: body.name,
      description: body.description,
      tokens: body.tokens as never,
    });
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
      // Phase 2.1: route through the planner. Planner extracts intent from the
      // envelope (e.g. payload.text for user-message), invokes any needed
      // skills/tools, then the composer renders. The previous direct
      // composer.compose(envelope.type, ...) call is gone — that path treated
      // 'user-message' literally as the intent.
      this.planner
        .plan({
          envelope,
          context: this.buildContext(envelope.type).conversationContext,
        })
        .then(async (planResult) => {
          const baseCtx = this.buildContext(planResult.intent);
          const composeCtx: ComposeContext = {
            ...baseCtx,
            conversationContext: {
              ...baseCtx.conversationContext,
              intent: planResult.intent,
              ...(planResult.narration ? { narrative: planResult.narration } : {}),
            },
            ...(planResult.invocations.length > 0
              ? { toolResults: planResult.invocations.map(toComposedInvocation) }
              : {}),
          };
          const layout = await this.options.composer.compose(planResult.intent, composeCtx);
          this.broadcastLayout(layout);
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[runtime] plan+compose failed:', err);
          this.broadcastError(buildErrorEnvelope(err, envelope.composeCycleId));
        });
    });
  }
}

/**
 * Convert a planner ToolInvocation (which carries an ExecutionResult with a
 * non-serializable Error.cause) to the wire-safe ComposedToolInvocation the
 * composer (and any future serializer) consumes.
 */
function toComposedInvocation(inv: ToolInvocation): ComposedToolInvocation {
  if (inv.result.ok) {
    return {
      name: inv.name,
      kind: inv.kind,
      input: inv.input,
      ok: true,
      output: inv.result.output,
      durationMs: inv.result.durationMs,
    };
  }
  const error: ComposedToolInvocation['error'] = {
    code: inv.result.error.code,
    message: inv.result.error.message,
  };
  if (inv.result.error.status !== undefined) {
    error.status = inv.result.error.status;
  }
  return {
    name: inv.name,
    kind: inv.kind,
    input: inv.input,
    ok: false,
    error,
    durationMs: inv.result.durationMs,
  };
}

/** Map executor error codes to HTTP statuses for the REST executor endpoints. */
function executorErrorToHttpStatus(code: ExecutionErrorCode): number {
  switch (code) {
    case 'unknown-skill':
    case 'unknown-tool':
      return 404;
    case 'no-handler':
    case 'unsupported-kind':
    case 'tool-config':
    case 'missing-input-param':
      return 400;
    case 'http-status':
    case 'http-network':
    case 'invalid-json':
    case 'handler-threw':
      return 502;
    case 'timeout':
      return 504;
    default: {
      // Exhaustiveness check — adding a new code without updating this switch should fail to compile.
      const _exhaustive: never = code;
      return 500;
    }
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const raw = await readTextBody(req);
  if (raw.length === 0) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed JSON body: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function readTextBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  return Buffer.concat(chunks).toString('utf-8').trim();
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
