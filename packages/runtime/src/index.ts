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
import { AnthropicProvider } from './model/index.js';
import {
  InMemoryComponentRegistry,
  InMemoryThemeRegistry,
  InMemorySkillRegistry,
  InMemoryToolRegistry,
  type ComponentRegistryStore,
  type ThemeRegistryStore,
  type SkillRegistryStore,
  type ToolRegistryStore,
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
  flattenDTCG,
  importStyleDictionary,
  importCssVariables,
  type ComponentRegistryStore,
  type ThemeRegistryStore,
  type SkillRegistryStore,
  type ToolRegistryStore,
} from './registry/index.js';
export {
  AnthropicProvider,
  MockProvider,
  ProviderError,
  type ModelProvider,
  type GenerateRequest,
  type GenerateResponse,
} from './model/index.js';

export interface RuntimeConfig {
  /** HTTP server port (default 8080). */
  port?: number;
  /** Anthropic API key. Defaults to ANTHROPIC_API_KEY env var. */
  anthropicApiKey?: string;
  /** Force composer choice; defaults to HaikuComposer when API key present, StubComposer otherwise. */
  composer?: 'auto' | 'stub' | 'haiku';
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

  constructor(public readonly config: RuntimeConfig = {}) {}

  async start(): Promise<void> {
    const composer = this.buildComposer();
    const port = this.config.port ?? 8080;
    this.server = new RuntimeServer({
      port,
      composer,
      componentRegistry: this.componentRegistry,
      themeRegistry: this.themeRegistry,
      skillRegistry: this.skillRegistry,
      toolRegistry: this.toolRegistry,
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
      `[saasagent/runtime v${VERSION}] listening on http://localhost:${this.server.port} (protocol v${PROTOCOL_VERSION}, composer=${composer.constructor.name})`,
    );
    // eslint-disable-next-line no-console
    console.log(`  • GET  http://localhost:${this.server.port}/health`);
    // eslint-disable-next-line no-console
    console.log(`  • GET  http://localhost:${this.server.port}/sse`);
    // eslint-disable-next-line no-console
    console.log(`  • WS   ws://localhost:${this.server.port}/ws`);
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
