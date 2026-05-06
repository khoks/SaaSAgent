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
  EvalSignal,
  FederationRequest,
  FederationResponse,
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
  type SubAgentRegistryStore,
  InMemoryComponentRegistry,
  InMemoryThemeRegistry,
  InMemorySkillRegistry,
  InMemoryToolRegistry,
  InMemoryFeatureRegistry,
  InMemorySubAgentRegistry,
  importStyleDictionary,
  importCssVariables,
  importFeatureMarkdown,
} from '../registry/index.js';
import {
  SkillExecutor,
  ToolExecutor,
  SubAgentExecutor,
  type ExecutionErrorCode,
  type ExecutionResult,
} from '../executor/index.js';
import { type Planner, StubPlanner, type ToolInvocation } from '../planner/index.js';
import { KeyValueMemoryProvider, type MemoryProvider } from '../memory/index.js';
import { KeyValueEvalProvider, type EvalProvider } from '../eval/index.js';
import { type ChurnRiskCalculator, RuleBasedChurnCalculator } from '../churn/index.js';

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
  /** Sub-Agents registry store (Phase 2.4). Defaults to a fresh InMemorySubAgentRegistry. */
  subAgentRegistry?: SubAgentRegistryStore;
  /**
   * SkillExecutor (Phase 2.0c). If omitted, the server constructs a default
   * SkillExecutor bound to its skillRegistry. Pass an explicit instance to
   * register handlers before start() (recommended path for host code).
   */
  skillExecutor?: SkillExecutor;
  /** ToolExecutor (Phase 2.0c). If omitted, the server constructs a default bound to its toolRegistry. */
  toolExecutor?: ToolExecutor;
  /** SubAgentExecutor (Phase 2.4). If omitted, the server constructs a default bound to its subAgentRegistry. */
  subAgentExecutor?: SubAgentExecutor;
  /**
   * Planner (Phase 2.1). Sits between the WS boundary and the composer; extracts
   * intent from envelopes and may invoke skills/tools before composing. Defaults
   * to StubPlanner (deterministic routing, no LLM).
   */
  planner?: Planner;
  /**
   * MemoryProvider (Phase 2.3). Used by /memory REST endpoints for inspection.
   * The planner gets its own MemoryProvider instance via SonnetPlannerOptions —
   * pass the same instance here AND there if you want REST inspection of what
   * the planner is reading/writing. If unset, defaults to a KeyValueMemoryProvider
   * (per-runtime) — REST endpoints work but planner sees its own (separate) memory
   * unless explicitly aligned.
   */
  memoryProvider?: MemoryProvider;
  /**
   * EvalProvider (Phase 2.5). Captures per-turn quality signals via REST POST
   * /eval and WS envelopes of type 'eval-feedback'. Defaults to a fresh
   * KeyValueEvalProvider (per-runtime, in-process). Future: ClickHouseEvalProvider
   * for durable analytics per ADR-032.
   */
  evalProvider?: EvalProvider;
  /**
   * Window in milliseconds for the implicit re-ask negative signal (Phase 2.5.x).
   * When a user-message arrives within this window after a layout broadcast,
   * the runtime infers a negative/user-implicit signal on the prior layout
   * (the user re-asked → previous response wasn't satisfying).
   * Default 8000 (8s). Set to 0 to disable.
   */
  implicitReaskWindowMs?: number;
  /**
   * ChurnRiskCalculator (Phase 2.6). Derives per-session churn-risk score from
   * the EvalProvider's signals. Default: RuleBasedChurnCalculator bound to
   * this server's evalProvider. Future: MLChurnCalculator behind the same
   * interface (rule-based becomes cold-start fallback).
   */
  churnCalculator?: ChurnRiskCalculator;
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
  private readonly subAgentRegistry: SubAgentRegistryStore;
  private readonly skillExecutor: SkillExecutor;
  private readonly toolExecutor: ToolExecutor;
  private readonly subAgentExecutor: SubAgentExecutor;
  private readonly planner: Planner;
  private readonly memoryProvider: MemoryProvider;
  private readonly evalProvider: EvalProvider;
  private readonly churnCalculator: ChurnRiskCalculator;
  private readonly implicitReaskWindowMs: number;
  private actualPort: number = 0;

  constructor(private readonly options: RuntimeServerOptions) {
    this.componentRegistry = options.componentRegistry ?? new InMemoryComponentRegistry();
    this.themeRegistry = options.themeRegistry ?? new InMemoryThemeRegistry();
    this.skillRegistry = options.skillRegistry ?? new InMemorySkillRegistry();
    this.toolRegistry = options.toolRegistry ?? new InMemoryToolRegistry();
    this.featureRegistry = options.featureRegistry ?? new InMemoryFeatureRegistry();
    this.subAgentRegistry = options.subAgentRegistry ?? new InMemorySubAgentRegistry();
    this.skillExecutor = options.skillExecutor ?? new SkillExecutor({ registry: this.skillRegistry });
    this.toolExecutor = options.toolExecutor ?? new ToolExecutor({ registry: this.toolRegistry });
    this.subAgentExecutor =
      options.subAgentExecutor ?? new SubAgentExecutor({ registry: this.subAgentRegistry });
    this.planner = options.planner ?? new StubPlanner();
    this.memoryProvider = options.memoryProvider ?? new KeyValueMemoryProvider();
    this.evalProvider = options.evalProvider ?? new KeyValueEvalProvider();
    this.churnCalculator =
      options.churnCalculator ?? new RuleBasedChurnCalculator({ evalProvider: this.evalProvider });
    this.implicitReaskWindowMs = options.implicitReaskWindowMs ?? 8000;
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
          subAgentRegistryVersion: this.subAgentRegistry.get().version,
          subAgentCount: Object.keys(this.subAgentRegistry.get().subAgents).length,
          memoryProvider: this.memoryProvider.name,
          evalProvider: this.evalProvider.name,
          evalSignalCount: this.evalProvider.count(),
          churnCalculator: this.churnCalculator.name,
        }),
      );
      return;
    }

    // Churn risk endpoints (Phase 2.6).
    // GET /churn/sessions/<id>  → ChurnRiskScore | { score: null, reason }
    // GET /churn                → { scores: ChurnRiskScore[] } sorted by score DESC
    if (url === '/churn' && req.method === 'GET') {
      const scores = await this.churnCalculator.computeAll();
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ scores, model: this.churnCalculator.name }));
      return;
    }
    if (url.startsWith('/churn/sessions/')) {
      const parsed = new URL(url, 'http://localhost');
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length === 3 && req.method === 'GET') {
        const sessionId = decodeURIComponent(segments[2]!);
        const score = await this.churnCalculator.computeForSession(sessionId);
        if (!score) {
          res.writeHead(404, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              sessionId,
              score: null,
              reason: 'no eval signals for this session',
            }),
          );
          return;
        }
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(score));
        return;
      }
    }

    // Eval REST endpoints (Phase 2.5).
    // POST /eval                   — record one EvalSignal (server stamps `at` if missing)
    // GET  /eval                   — query with ?sessionId=&composeCycleId=&signal=&since=&limit=
    // GET  /eval/sessions/<id>     — convenience: signals for a specific session
    if (url === '/eval' || url.startsWith('/eval?')) {
      const parsed = new URL(url, 'http://localhost');
      if (req.method === 'POST') {
        const body = (await readJsonBody(req)) as Partial<EvalSignal> | null;
        if (
          !body ||
          typeof body.composeCycleId !== 'string' ||
          typeof body.signal !== 'string' ||
          typeof body.source !== 'string'
        ) {
          res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: 'POST body must be { composeCycleId, signal, source, ... } EvalSignal',
            }),
          );
          return;
        }
        const signal: EvalSignal = {
          ...body,
          composeCycleId: body.composeCycleId,
          signal: body.signal as EvalSignal['signal'],
          source: body.source as EvalSignal['source'],
          at: body.at ?? new Date().toISOString(),
        };
        await this.evalProvider.record(signal);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ recorded: true, total: this.evalProvider.count() }));
        return;
      }
      if (req.method === 'GET') {
        const filter = {
          ...(parsed.searchParams.get('sessionId') ? { sessionId: parsed.searchParams.get('sessionId')! } : {}),
          ...(parsed.searchParams.get('composeCycleId')
            ? { composeCycleId: parsed.searchParams.get('composeCycleId')! }
            : {}),
          ...(parsed.searchParams.get('signal')
            ? { signal: parsed.searchParams.get('signal') as EvalSignal['signal'] }
            : {}),
          ...(parsed.searchParams.get('since') ? { since: parsed.searchParams.get('since')! } : {}),
          ...(parsed.searchParams.get('limit') ? { limit: Number(parsed.searchParams.get('limit')) } : {}),
        };
        const signals = await this.evalProvider.query(filter);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signals, total: this.evalProvider.count() }));
        return;
      }
    }
    if (url.startsWith('/eval/sessions/')) {
      const parsed = new URL(url, 'http://localhost');
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length === 3 && req.method === 'GET') {
        const sessionId = decodeURIComponent(segments[2]!);
        const signals = await this.evalProvider.query({ sessionId });
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId, signals }));
        return;
      }
    }

    // Federation endpoint (Phase 2.4.x). ANY runtime can be a sub-agent of
    // another runtime — federation is symmetric. The parent's SubAgentExecutor
    // POSTs FederationRequest here; we synthesize a user-message envelope from
    // the intent, run our local planner, and return the planner's narration +
    // invocations as a FederationResponse.
    if (url === '/federate' && req.method === 'POST') {
      const body = (await readJsonBody(req)) as FederationRequest | null;
      if (!body || typeof body.intent !== 'string' || body.intent.length === 0) {
        res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: { code: 'bad-request', message: 'FederationRequest must include a non-empty intent string' },
          } satisfies FederationResponse),
        );
        return;
      }
      const envelope: InstructionEnvelope = {
        composeCycleId: `federate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        sourceNodeId: 'federation-caller',
        emittedAt: new Date().toISOString(),
        type: 'user-message',
        sequence: 0,
        payload: { text: body.intent, ...(body.payload ?? {}) },
      };
      try {
        const planResult = await this.planner.plan({
          envelope,
          context: this.buildContext(envelope.type).conversationContext,
          ...(body.sessionId ? { sessionId: body.sessionId } : {}),
        });
        const fedResponse: FederationResponse = {};
        if (planResult.narration) fedResponse.narration = planResult.narration;
        if (planResult.invocations.length > 0) {
          // Aggregate output: list every successful invocation's output, keyed by name+kind.
          const okOutputs = planResult.invocations
            .filter((i) => i.result.ok)
            .map((i) => ({
              name: i.name,
              kind: i.kind,
              output: i.result.ok ? i.result.output : undefined,
            }));
          if (okOutputs.length === 1 && okOutputs[0]) {
            fedResponse.output = okOutputs[0].output;
          } else if (okOutputs.length > 1) {
            fedResponse.output = okOutputs;
          }
          fedResponse.invocations = planResult.invocations.map((i) => ({
            name: i.name,
            kind: i.kind,
            input: i.input,
            ok: i.result.ok,
            ...(i.result.ok ? { output: i.result.output } : {}),
            ...(i.result.ok
              ? {}
              : { error: { code: i.result.error.code, message: i.result.error.message } }),
            durationMs: i.result.durationMs,
          }));
        }
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fedResponse));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[runtime] /federate plan failed:', err);
        const fedResponse: FederationResponse = {
          error: {
            code: 'plan-failed',
            message: err instanceof Error ? err.message : String(err),
          },
        };
        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fedResponse));
      }
      return;
    }

    // Memory inspection endpoints (Phase 2.3). Only meaningful when the
    // memoryProvider is a KeyValueMemoryProvider; for other providers (Null,
    // Postgres) the GET endpoints return 501 since there's no in-process state
    // to enumerate.
    if (url.startsWith('/memory/sessions')) {
      const parsed = new URL(url, 'http://localhost');
      const segments = parsed.pathname.split('/').filter(Boolean); // ['memory','sessions',?id]
      const provider = this.memoryProvider as Partial<KeyValueMemoryProvider>;
      if (typeof provider.listSessions !== 'function') {
        res.writeHead(501, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: `Memory inspection not supported by provider "${this.memoryProvider.name}"`,
          }),
        );
        return;
      }
      // /memory/sessions
      if (segments.length === 2) {
        if (req.method === 'GET') {
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sessions: provider.listSessions() }));
          return;
        }
      }
      // /memory/sessions/<id>
      if (segments.length === 3) {
        const id = decodeURIComponent(segments[2]!);
        if (req.method === 'GET') {
          res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              sessionId: id,
              turns: provider.getSession ? provider.getSession(id) : [],
            }),
          );
          return;
        }
        if (req.method === 'DELETE') {
          const cleared = provider.clearSession ? provider.clearSession(id) : false;
          res.writeHead(cleared ? 200 : 404, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sessionId: id, cleared }));
          return;
        }
      }
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

    // Skills + Tools + Sub-Agents registries (Phase 2.0b + 2.4). Same shape as components: GET / PUT / POST / DELETE.
    if (
      url === '/registry/skills' ||
      url === '/registry/tools' ||
      url === '/registry/subagents'
    ) {
      const which: 'skills' | 'tools' | 'subagents' =
        url === '/registry/skills' ? 'skills' : url === '/registry/tools' ? 'tools' : 'subagents';
      const reg =
        which === 'skills'
          ? this.skillRegistry
          : which === 'tools'
            ? this.toolRegistry
            : this.subAgentRegistry;
      const collectionKey = which === 'subagents' ? 'subAgents' : which;
      if (req.method === 'GET') {
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reg.get()));
        return;
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const items = Array.isArray(body)
          ? body
          : ((body as Record<string, unknown> | null)?.[collectionKey] ?? []);
        const updated = (reg as { replace: (items: unknown) => unknown }).replace(items);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === 'POST') {
        const body = (await readJsonBody(req)) as { name?: string };
        if (!body?.name) {
          res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: `POST body must have a name field (${which === 'subagents' ? 'sub-agent' : which.slice(0, -1)})`,
            }),
          );
          return;
        }
        const updated = (reg as { upsert: (item: unknown) => unknown }).upsert(body);
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
      if (req.method === 'DELETE') {
        const updated = (reg as { clear: () => unknown }).clear();
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }
    }

    // Executor endpoints — POST /executor/skill/<name> | /executor/tool/<name> | /executor/subagent/<name>.
    // Body is the input args (JSON object). Response is the wire-form ExecutionResult.
    // HTTP status maps to the error code so a basic curl/HTTP client can branch without parsing JSON.
    const execMatch = /^\/executor\/(skill|tool|subagent)\//.exec(url);
    if (execMatch) {
      const kind = execMatch[1] as 'skill' | 'tool' | 'subagent';
      const parsed = new URL(url, 'http://localhost');
      const prefix = `/executor/${kind}/`;
      const name = decodeURIComponent(parsed.pathname.slice(prefix.length));
      if (!name) {
        res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `name required: POST /executor/${kind}/<name>` }));
        return;
      }
      if (req.method !== 'POST') {
        res.writeHead(405, { ...CORS_HEADERS, 'Content-Type': 'text/plain', Allow: 'POST' });
        res.end('method not allowed; use POST');
        return;
      }
      const body = await readJsonBody(req);
      const input = body ?? {};
      let result: ExecutionResult;
      if (kind === 'skill') {
        result = await this.skillExecutor.execute(name, input);
      } else if (kind === 'tool') {
        result = await this.toolExecutor.execute(name, input);
      } else {
        // sub-agent — input is a FederationRequest shape (typically { intent, payload? })
        const subInput = input as { intent?: string; payload?: Record<string, unknown> };
        const intent = typeof subInput.intent === 'string' ? subInput.intent : JSON.stringify(input);
        result = await this.subAgentExecutor.execute(name, {
          intent,
          ...(subInput.payload ? { payload: subInput.payload } : {}),
        });
      }
      const status = result.ok ? 200 : executorErrorToHttpStatus(result.error.code);
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
    // Phase 2.3: assign one sessionId per WS connection — bounds memory scope
    // to this conversation. Tab close/reopen → new session (fine for MVP;
    // cross-session continuity is a Phase 2.4+ concern requiring user identity).
    const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    // Phase 2.5.x: per-connection state for implicit re-ask signal inference.
    // We track the last layout we BROADCAST to the world (via SSE) plus when —
    // if a user-message arrives shortly after, that's a re-ask, infer negative.
    let lastBroadcastCycleId: string | null = null;
    let lastBroadcastAt = 0;
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

      // Phase 2.5: intercept eval-feedback envelopes BEFORE the planner.
      // payload shape: { signal: 'positive'|'negative'|'neutral'|'completion',
      //                  source?: 'user-explicit'|..., score?, comment?, intent? }
      // The envelope's composeCycleId identifies the layout being scored.
      if (envelope.type === 'eval-feedback') {
        const payload = (envelope.payload ?? {}) as Partial<EvalSignal>;
        const signal: EvalSignal = {
          composeCycleId: envelope.composeCycleId,
          sessionId,
          ...(payload.userId ? { userId: payload.userId } : {}),
          signal: (payload.signal as EvalSignal['signal']) ?? 'neutral',
          source: (payload.source as EvalSignal['source']) ?? 'user-explicit',
          ...(typeof payload.score === 'number' ? { score: payload.score } : {}),
          ...(typeof payload.comment === 'string' ? { comment: payload.comment } : {}),
          ...(typeof payload.intent === 'string' ? { intent: payload.intent } : {}),
          at: new Date().toISOString(),
        };
        void this.evalProvider.record(signal).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[runtime] eval record failed:', err);
        });
        // Don't re-compose — feedback envelopes are out-of-band.
        return;
      }

      // Phase 2.5.x: implicit re-ask negative signal.
      // If a user-message arrives within implicitReaskWindowMs of a previous
      // layout broadcast on this WS, infer the user re-asked because the prior
      // layout missed — record a 'negative' / 'user-implicit' signal on it.
      // (Action emits like button clicks don't trigger this — only fresh
      // user-messages, which suggest the user wasn't satisfied with the layout.)
      if (
        envelope.type === 'user-message' &&
        this.implicitReaskWindowMs > 0 &&
        lastBroadcastCycleId &&
        Date.now() - lastBroadcastAt < this.implicitReaskWindowMs
      ) {
        const implicitSignal: EvalSignal = {
          composeCycleId: lastBroadcastCycleId,
          sessionId,
          signal: 'negative',
          source: 'user-implicit',
          comment: `re-ask within ${Date.now() - lastBroadcastAt}ms`,
          at: new Date().toISOString(),
        };
        void this.evalProvider.record(implicitSignal).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[runtime] implicit eval record failed:', err);
        });
      }

      // Phase 2.1: route through the planner. Planner extracts intent from the
      // envelope (e.g. payload.text for user-message), invokes any needed
      // skills/tools, then the composer renders. The previous direct
      // composer.compose(envelope.type, ...) call is gone — that path treated
      // 'user-message' literally as the intent.
      this.planner
        .plan({
          envelope,
          context: this.buildContext(envelope.type).conversationContext,
          sessionId,
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
          // Track this broadcast for the next user-message's re-ask check.
          lastBroadcastCycleId = layout.composeCycleId;
          lastBroadcastAt = Date.now();
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
