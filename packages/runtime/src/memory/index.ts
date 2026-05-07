/**
 * Memory module barrel — Phases 2.3 + 2.3.x.
 *
 *   • NullMemoryProvider          (2.1a)  — drops everything; useful for tests.
 *   • KeyValueMemoryProvider      (2.3)   — in-process Map keyed by sessionId.
 *   • DurableFileMemoryProvider   (2.3.x) — JSON file on disk (atomic writes).
 *   • PostgresMemoryProvider      (2.3.x) — durable, scalable; requires pg client.
 *   • ChainedMemoryProvider       (2.3.x) — composes multiple providers.
 */

export type { MemoryProvider, MemoryQuery } from './types.js';
export { NullMemoryProvider } from './null.js';
export {
  KeyValueMemoryProvider,
  type KeyValueMemoryProviderOptions,
} from './keyvalue.js';
export {
  DurableFileMemoryProvider,
  type DurableFileMemoryProviderOptions,
} from './durable-file.js';
export {
  PostgresMemoryProvider,
  type PostgresMemoryProviderOptions,
  type PgClient,
} from './postgres.js';
export { ChainedMemoryProvider } from './chained.js';
export {
  QdrantMemoryProvider,
  type QdrantMemoryProviderOptions,
  type EmbeddingFn,
} from './qdrant.js';
