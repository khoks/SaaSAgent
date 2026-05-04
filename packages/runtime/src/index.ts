/**
 * @saasagent/runtime — platform runtime entry point.
 *
 * The runtime is the substrate that orchestrates Skills, Sub-Agents, Tools,
 * and the UI Composer. It runs inside the enterprise's data plane (per ADR-006)
 * and serves the Web Component shell over SSE + WebSocket (per ADR-038).
 *
 * Status: Phase 1.2 — RuntimeServer (SSE + WS) wired with StubComposer.
 *   Real planner + LLM Composer arrive in Phase 1.3.
 */

import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { PROTOCOL_VERSION } from '@saasagent/protocol';

import { StubComposer } from './composer/index.js';
import { RuntimeServer } from './transport/index.js';

export const VERSION = '0.0.0';
export { StubComposer } from './composer/index.js';
export { RuntimeServer } from './transport/index.js';

export interface RuntimeConfig {
  /** HTTP server port (default 8080). */
  port?: number;
  /** Anthropic API key. */
  anthropicApiKey?: string;
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

  constructor(public readonly config: RuntimeConfig = {}) {}

  async start(): Promise<void> {
    const composer = new StubComposer();
    const port = this.config.port ?? 8080;
    this.server = new RuntimeServer({
      port,
      composer,
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
      `[saasagent/runtime v${VERSION}] listening on http://localhost:${this.server.port} (protocol v${PROTOCOL_VERSION})`,
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
