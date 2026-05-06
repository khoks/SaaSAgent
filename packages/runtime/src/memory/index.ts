/**
 * Memory module barrel — Phase 2.3.
 *
 *   • NullMemoryProvider     (2.1a) — drops everything; useful for tests.
 *   • KeyValueMemoryProvider (2.3)  — in-process Map keyed by sessionId; the
 *     production default until PostgresMemoryProvider lands in 2.3.x.
 */

export type { MemoryProvider, MemoryQuery } from './types.js';
export { NullMemoryProvider } from './null.js';
export {
  KeyValueMemoryProvider,
  type KeyValueMemoryProviderOptions,
} from './keyvalue.js';
