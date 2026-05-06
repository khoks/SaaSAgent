/**
 * Eval module barrel — Phase 2.5.
 *
 *   • KeyValueEvalProvider (2.5)   — in-process append log; production default until 2.5.x.
 *   • ClickHouseEvalProvider (2.5.x, deferred) — durable storage per ADR-032.
 */

export type { EvalProvider, EvalFilter } from './types.js';
export {
  KeyValueEvalProvider,
  type KeyValueEvalProviderOptions,
} from './keyvalue.js';
