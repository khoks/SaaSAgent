/**
 * @saasagent/runtime — platform runtime entry point.
 *
 * The runtime is the substrate that orchestrates Skills, Sub-Agents, Tools,
 * and the UI Composer. It runs inside the enterprise's data plane (per ADR-006)
 * and is consumed by the Web Component shell over a real-time transport.
 *
 * Status: Phase 0 (foundation scaffolding only — not yet functional).
 * See docs/work/initiatives/INIT-003-build-mvp.md for the build plan.
 */

export const VERSION = '0.0.0';

export interface RuntimeConfig {
  /** Anthropic API key (or path through enterprise's provider — Bedrock / Vertex / Azure). */
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
  constructor(public readonly config: RuntimeConfig) {}

  async start(): Promise<void> {
    // Phase 0 stub. Real wiring lands in Phase 1+.
    console.log(`[saasagent/runtime v${VERSION}] starting (Phase 0 skeleton — registries, planner, composer not yet wired).`);
  }

  async stop(): Promise<void> {
    console.log(`[saasagent/runtime v${VERSION}] stopping.`);
  }
}

// Allow `node dist/index.js` invocation for smoke testing.
// Cross-platform main-module detection: fileURLToPath normalizes the path the same way on Windows + POSIX.
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isMain) {
  const runtime = new Runtime({});
  runtime.start().catch((err: unknown) => {
    console.error('runtime failed to start:', err);
    process.exit(1);
  });
}
