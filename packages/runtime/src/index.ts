/**
 * @saasagent/runtime — platform runtime entry point.
 *
 * The runtime is the substrate that orchestrates Skills, Sub-Agents, Tools,
 * and the UI Composer. It runs inside the enterprise's data plane (per ADR-006)
 * and is consumed by the Web Component shell over the SSE + WebSocket transport
 * (per ADR-038).
 *
 * Status: Phase 1 slice 1.1 (protocol + stub composer wired; real transport + LLM
 * composer in subsequent slices).
 */

import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

import { PROTOCOL_VERSION } from '@saasagent/protocol';

export const VERSION = '0.0.0';
export { StubComposer } from './composer/index.js';

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
    console.log(
      `[saasagent/runtime v${VERSION}] starting (Phase 1.1 — protocol v${PROTOCOL_VERSION} + stub composer wired; transport + LLM composer in next slices).`,
    );
  }

  async stop(): Promise<void> {
    console.log(`[saasagent/runtime v${VERSION}] stopping.`);
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
  const runtime = new Runtime({});
  runtime.start().catch((err: unknown) => {
    console.error('runtime failed to start:', err);
    process.exit(1);
  });
}
