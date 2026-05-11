/**
 * @saasagent/runtime — platform runtime entry point.
 *
 * The runtime is the substrate that orchestrates Skills, Sub-Agents, Tools,
 * and the UI Composer. It runs inside the enterprise's data plane (per ADR-006)
 * and serves the Web Component shell over SSE + WebSocket (per ADR-038).
 *
 * Status: Phase 1.3 — real LLM Composer (HaikuComposer per ADR-012) wired in
 *   when ANTHROPIC_API_KEY is present; falls back to StubComposer otherwise so
 *   the runtime still boots end-to-end without API credentials (useful for
 *   offline development + CI). Real planner + Atomic UI Components registry +
 *   DTCG theme tokens land in Phases 2 and 1.4 respectively.
 */

import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { PROTOCOL_VERSION, type UIComposer } from '@saasagent/protocol';

import { HaikuComposer, StubComposer } from './composer/index.js';
import { SkillExecutor, SubAgentExecutor, ToolExecutor } from './executor/index.js';
import { KeyValueMemoryProvider, type MemoryProvider } from './memory/index.js';
import { KeyValueEvalProvider, type EvalProvider } from './eval/index.js';
import { type ChurnRiskCalculator, RuleBasedChurnCalculator } from './churn/index.js';
import { type TierProvider } from './quota/index.js';
import { AnthropicProvider } from './model/index.js';
import { type Planner, SonnetPlanner, StubPlanner } from './planner/index.js';
import {
  InMemoryComponentRegistry,
  InMemoryThemeRegistry,
  InMemorySkillRegistry,
  InMemoryToolRegistry,
  InMemoryFeatureRegistry,
  InMemorySubAgentRegistry,
  type ComponentRegistryStore,
  type ThemeRegistryStore,
  type SkillRegistryStore,
  type ToolRegistryStore,
  type FeatureRegistryStore,
  type SubAgentRegistryStore,
} from './registry/index.js';
import { RuntimeServer } from './transport/index.js';

export const VERSION = '0.0.0';
export { StubComposer, HaikuComposer } from './composer/index.js';
export { RuntimeServer } from './transport/index.js';
export {
  InMemoryComponentRegistry,
  InMemoryThemeRegistry,
  InMemorySkillRegistry,
  InMemoryToolRegistry,
  InMemoryFeatureRegistry,
  InMemorySubAgentRegistry,
  flattenDTCG,
  importStyleDictionary,
  importCssVariables,
  importFeatureMarkdown,
  type ComponentRegistryStore,
  type ThemeRegistryStore,
  type SkillRegistryStore,
  type ToolRegistryStore,
  type FeatureRegistryStore,
  type SubAgentRegistryStore,
} from './registry/index.js';
export {
  SkillExecutor,
  ToolExecutor,
  SubAgentExecutor,
  substituteUrl,
  type SkillHandler,
  type SkillExecutorOptions,
  type ToolExecutorOptions,
  type SubAgentExecutorOptions,
  type SubAgentInvokeRequest,
  type ExecutionContext,
  type ExecutionResult,
  type ExecutionError,
  type ExecutionErrorCode,
} from './executor/index.js';
export {
  AnthropicProvider,
  MockProvider,
  ProviderError,
  type ModelProvider,
  type GenerateRequest,
  type GenerateResponse,
} from './model/index.js';
export {
  NullMemoryProvider,
  KeyValueMemoryProvider,
  DurableFileMemoryProvider,
  PostgresMemoryProvider,
  ChainedMemoryProvider,
  QdrantMemoryProvider,
  type KeyValueMemoryProviderOptions,
  type DurableFileMemoryProviderOptions,
  type PostgresMemoryProviderOptions,
  type QdrantMemoryProviderOptions,
  type EmbeddingFn,
  type PgClient,
  type MemoryProvider,
  type MemoryQuery,
} from './memory/index.js';
export {
  KeyValueEvalProvider,
  ClickHouseEvalProvider,
  type KeyValueEvalProviderOptions,
  type ClickHouseEvalProviderOptions,
  type ClickHouseClient,
  type EvalProvider,
  type EvalFilter,
} from './eval/index.js';
export {
  InMemoryEventStream,
  KafkaEventStream,
  RuntimeTopics,
  type EventStream,
  type EventHandler,
  type RuntimeEvent,
  type KafkaEventStreamOptions,
  type KafkaProducer,
  type KafkaConsumer,
} from './events/index.js';
export {
  InMemoryGraphProvider,
  Neo4jGraphProvider,
  type RelationshipGraph,
  type GraphNode,
  type GraphEdge,
  type GraphPath,
  type Neo4jGraphProviderOptions,
  type Neo4jDriver,
  type Neo4jSession,
  type Neo4jRecord,
} from './graph/index.js';
export {
  RuleBasedChurnCalculator,
  WeightedFeatureChurnCalculator,
  DEFAULT_WEIGHTS,
  type RuleBasedChurnCalculatorOptions,
  type WeightedFeatureChurnCalculatorOptions,
  type ChurnWeights,
  type FeatureVector,
  type ChurnRiskCalculator,
} from './churn/index.js';
export {
  StubPlanner,
  SonnetPlanner,
  type SonnetPlannerOptions,
  type Planner,
  type PlanRequest,
  type PlanResult,
  type ToolInvocation,
  descriptorsToTools,
  parseToolName,
  qualifyToolName,
  SKILL_PREFIX,
  TOOL_PREFIX,
} from './planner/index.js';
export {
  trainChurnWeights,
  type LabeledSample,
  type TrainOptions,
  type TrainResult,
} from './churn/index.js';
export {
  NoAuthProvider,
  BearerTokenAuthProvider,
  JWTAuthProvider,
  parseBearer,
  constantTimeEq,
  type AuthProvider,
  type AuthInput,
  type AuthResult,
  type AuthPrincipal,
  type BearerTokenAuthProviderOptions,
  type JWTAuthProviderOptions,
  type JWTAlgorithm,
} from './auth/index.js';
export {
  NoopTelemetry,
  ConsoleTelemetry,
  OpenTelemetryAdapter,
  type Telemetry,
  type LogLevel,
  type LogContext,
  type SpanAttrs,
  type ConsoleTelemetryOptions,
  type OpenTelemetryAdapterOptions,
  type OtelTracer,
  type OtelMeter,
  type OtelLogger,
} from './telemetry/index.js';
export {
  DEFAULT_TENANT,
  tenantScopedSessionId,
  parseScopedSessionId,
  MultiTenantSkillRegistry,
  MultiTenantToolRegistry,
  MultiTenantFeatureRegistry,
  MultiTenantSubAgentRegistry,
} from './tenancy/index.js';
export {
  NoopMeteringProvider,
  ConsoleMeteringProvider,
  UsageMeteringProvider,
  type MeteringProvider,
  type MeteringEvent,
  type MeteringEventKind,
  type UsageMeteringProviderOptions,
  type UsageRollup,
} from './metering/index.js';
export {
  NoQuotaProvider,
  InMemoryTierProvider,
  type TierProvider,
  type TierDefinition,
  type QuotaCheckResult,
  type InMemoryTierProviderOptions,
} from './quota/index.js';

export interface RuntimeConfig {
  /** HTTP server port (default 8080). */
  port?: number;
  /** Anthropic API key. Defaults to ANTHROPIC_API_KEY env var. */
  anthropicApiKey?: string;
  /** Force composer choice; defaults to HaikuComposer when API key present, StubComposer otherwise. */
  composer?: 'auto' | 'stub' | 'haiku';
  /**
   * Force planner choice. Defaults to 'stub' in 2.1a; 'auto' will pick SonnetPlanner
   * when ANTHROPIC_API_KEY is present once Phase 2.1b lands.
   */
  planner?: 'auto' | 'stub' | 'sonnet';
  /**
   * Bearer token required on all REST + WS requests (Phase 2.7). When unset the
   * runtime is unauthenticated. /health + OPTIONS are always allowed.
   */
  authToken?: string;
  /** Per-IP REST rate limit in requests-per-minute (Phase 2.7). 0 disables. */
  rateLimitRestPerMinute?: number;
  /** Per-WS-connection message rate limit in messages-per-minute (Phase 2.7). 0 disables. */
  rateLimitWsPerMinute?: number;
  /** Postgres connection string. */
  postgresUrl?: string;
  /** Qdrant URL. */
  qdrantUrl?: string;
  /** Redpanda / Kafka brokers. */
  kafkaBrokers?: string[];
  /** ClickHouse URL. */
  clickhouseUrl?: string;
  /** Neo4j URL. */
  neo4jUrl?: string;
  /**
   * End-user tier/quota provider (Phase 7 / ADR-036). When unset, the
   * runtime uses NoQuotaProvider (unlimited; no quotaStatus in layouts).
   * Host integrators construct an InMemoryTierProvider or their own
   * TierProvider implementation and pass it here.
   */
  quotaProvider?: TierProvider;
}

export class Runtime {
  private server: RuntimeServer | null = null;
  /** Public so demo seeders / tests can pre-register primitives before start(). */
  readonly componentRegistry: ComponentRegistryStore = new InMemoryComponentRegistry();
  /** Public theme registry for the same reason. */
  readonly themeRegistry: ThemeRegistryStore = new InMemoryThemeRegistry();
  /** Public skills registry (Phase 2.0b). */
  readonly skillRegistry: SkillRegistryStore = new InMemorySkillRegistry();
  /** Public tools registry (Phase 2.0b). */
  readonly toolRegistry: ToolRegistryStore = new InMemoryToolRegistry();
  /**
   * Public features registry (Phase 2.2). Long-form `.feature.md` documents the
   * planner reads as super-skill context to understand the host's domain.
   */
  readonly featureRegistry: FeatureRegistryStore = new InMemoryFeatureRegistry();
  /**
   * Public sub-agents registry (Phase 2.4). Federated runtimes the parent
   * planner delegates to over a JSON federation contract.
   */
  readonly subAgentRegistry: SubAgentRegistryStore = new InMemorySubAgentRegistry();
  /**
   * SkillExecutor (Phase 2.0c). Public so host code can `runtime.skillExecutor.registerHandler('foo', fn)`
   * after construction. Bound to the same skillRegistry instance used by REST + the planner.
   */
  readonly skillExecutor: SkillExecutor = new SkillExecutor({ registry: this.skillRegistry });
  /** ToolExecutor (Phase 2.0c) — uses globalThis.fetch + process.env unless replaced. */
  readonly toolExecutor: ToolExecutor = new ToolExecutor({ registry: this.toolRegistry });
  /**
   * SubAgentExecutor (Phase 2.4). Posts JSON FederationRequests to registered
   * sub-agents over HTTP; SonnetPlanner dispatches subagent__ tool calls here.
   */
  readonly subAgentExecutor: SubAgentExecutor = new SubAgentExecutor({
    registry: this.subAgentRegistry,
  });
  /**
   * MemoryProvider (Phase 2.3 default: KeyValueMemoryProvider — in-process
   * Map keyed by sessionId). Same instance is shared with the SonnetPlanner
   * AND the /memory REST endpoints so REST inspection sees what the planner
   * is reading/writing. Future: PostgresMemoryProvider when config.postgresUrl
   * is set (deferred to 2.3.x).
   */
  readonly memoryProvider: MemoryProvider = new KeyValueMemoryProvider();
  /**
   * EvalProvider (Phase 2.5). Captures per-turn quality signals via REST POST
   * /eval and WS envelopes of type 'eval-feedback'. Default in-process
   * KeyValueEvalProvider; future ClickHouseEvalProvider for durable analytics
   * per ADR-032.
   */
  readonly evalProvider: EvalProvider = new KeyValueEvalProvider();
  /**
   * ChurnRiskCalculator (Phase 2.6). Derives per-session churn-risk score
   * from the evalProvider's signals. Default rule-based v0; future
   * MLChurnCalculator slots in behind the same interface per ADR-032.
   */
  readonly churnCalculator: ChurnRiskCalculator = new RuleBasedChurnCalculator({
    evalProvider: this.evalProvider,
  });
  /**
   * Planner (Phase 2.1). Built lazily in start() based on config.planner so we
   * can pick StubPlanner vs SonnetPlanner depending on environment. Public so
   * host code / tests can introspect after start().
   */
  planner: Planner = new StubPlanner();

  constructor(public readonly config: RuntimeConfig = {}) {}

  async start(): Promise<void> {
    const composer = this.buildComposer();
    this.planner = this.buildPlanner();
    const port = this.config.port ?? 8080;
    this.server = new RuntimeServer({
      port,
      composer,
      componentRegistry: this.componentRegistry,
      themeRegistry: this.themeRegistry,
      skillRegistry: this.skillRegistry,
      toolRegistry: this.toolRegistry,
      featureRegistry: this.featureRegistry,
      subAgentRegistry: this.subAgentRegistry,
      skillExecutor: this.skillExecutor,
      toolExecutor: this.toolExecutor,
      subAgentExecutor: this.subAgentExecutor,
      planner: this.planner,
      memoryProvider: this.memoryProvider,
      evalProvider: this.evalProvider,
      churnCalculator: this.churnCalculator,
      ...(this.config.authToken ? { authToken: this.config.authToken } : {}),
      ...(this.config.rateLimitRestPerMinute !== undefined
        ? { rateLimitRestPerMinute: this.config.rateLimitRestPerMinute }
        : {}),
      ...(this.config.rateLimitWsPerMinute !== undefined
        ? { rateLimitWsPerMinute: this.config.rateLimitWsPerMinute }
        : {}),
      ...(this.config.quotaProvider ? { quotaProvider: this.config.quotaProvider } : {}),
      onInstruction: (env) => {
        // eslint-disable-next-line no-console
        console.log(
          `[runtime] received instruction type=${env.type} cycle=${env.composeCycleId} source=${env.sourceNodeId} payload=${JSON.stringify(env.payload ?? {})}`,
        );
      },
      onSSEConnect: () => {
        // eslint-disable-next-line no-console
        console.log('[runtime] SSE client connected');
      },
      onWSConnect: () => {
        // eslint-disable-next-line no-console
        console.log('[runtime] WS client connected');
      },
    });
    await this.server.start();
    // eslint-disable-next-line no-console
    console.log(
      `[saasagent/runtime v${VERSION}] listening on http://localhost:${this.server.port} (protocol v${PROTOCOL_VERSION}, composer=${composer.constructor.name}, planner=${this.planner.name})`,
    );
    // eslint-disable-next-line no-console
    console.log(`  • GET  http://localhost:${this.server.port}/health`);
    // eslint-disable-next-line no-console
    console.log(`  • GET  http://localhost:${this.server.port}/sse`);
    // eslint-disable-next-line no-console
    console.log(`  • WS   ws://localhost:${this.server.port}/ws`);
    // Surface the dev-mode story prominently on first boot so enterprise devs
    // evaluating the platform don't conclude "nothing works" when StubPlanner
    // is active. The data plane works; only natural-language → skill orchestration
    // needs an API key.
    if (this.planner.name === 'stub') {
      // eslint-disable-next-line no-console
      console.log(
        `\n[runtime] mode=STUB — no ANTHROPIC_API_KEY detected. The UI shell will load and\n          DOM observation / eval signals will flow, but the planner will not\n          translate user messages into skill calls. To exercise skills:\n            curl -X POST -H 'content-type: application/json' \\\n              -d '<input JSON>' http://localhost:${this.server.port}/executor/skill/<name>\n          GET /health for the full dev-hint with registered skill names.\n`,
      );
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
      this.server = null;
    }
    // eslint-disable-next-line no-console
    console.log(`[saasagent/runtime v${VERSION}] stopped.`);
  }

  private buildComposer(): UIComposer {
    const apiKey = this.config.anthropicApiKey ?? process.env['ANTHROPIC_API_KEY'];
    const choice = this.config.composer ?? 'auto';
    if (choice === 'stub' || (choice === 'auto' && !apiKey)) {
      // eslint-disable-next-line no-console
      console.log('[runtime] using StubComposer (no ANTHROPIC_API_KEY or composer=stub).');
      return new StubComposer();
    }
    // eslint-disable-next-line no-console
    console.log('[runtime] using HaikuComposer (claude-haiku-4-5 + claude-sonnet-4-6 fallback).');
    return new HaikuComposer({
      provider: new AnthropicProvider({ apiKey: apiKey ?? undefined }),
    });
  }

  /**
   * Pick StubPlanner vs SonnetPlanner based on config + API key presence.
   * Mirrors buildComposer's auto/stub/<llm> tri-state.
   */
  private buildPlanner(): Planner {
    const apiKey = this.config.anthropicApiKey ?? process.env['ANTHROPIC_API_KEY'];
    const choice = this.config.planner ?? 'auto';
    if (choice === 'stub' || (choice === 'auto' && !apiKey)) {
      // eslint-disable-next-line no-console
      console.log('[runtime] using StubPlanner (no ANTHROPIC_API_KEY or planner=stub).');
      return new StubPlanner();
    }
    // eslint-disable-next-line no-console
    console.log(
      '[runtime] using SonnetPlanner (claude-sonnet-4-6 with tool_use, max 5 rounds).',
    );
    return new SonnetPlanner({
      provider: new AnthropicProvider({ apiKey: apiKey ?? undefined }),
      skillExecutor: this.skillExecutor,
      toolExecutor: this.toolExecutor,
      subAgentExecutor: this.subAgentExecutor,
      skillRegistry: this.skillRegistry,
      toolRegistry: this.toolRegistry,
      subAgentRegistry: this.subAgentRegistry,
      featureRegistry: this.featureRegistry,
      memoryProvider: this.memoryProvider,
    });
  }
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isMain) {
  const port = process.env['SAAS_AGENT_PORT'] ? Number(process.env['SAAS_AGENT_PORT']) : 8080;
  const runtime = new Runtime({ port });
  runtime.start().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('runtime failed to start:', err);
    process.exit(1);
  });
  const shutdown = async (sig: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\n[runtime] caught ${sig}, shutting down…`);
    await runtime.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
