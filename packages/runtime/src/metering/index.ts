/**
 * Metering module barrel — Phase 6 (Bucket C.7).
 *
 *   • NoopMeteringProvider     — default; drops everything.
 *   • ConsoleMeteringProvider  — JSON-line per event for dev.
 *   • UsageMeteringProvider    — in-memory rollups for snapshot/reset patterns.
 */

export type { MeteringProvider, MeteringEvent, MeteringEventKind } from './types.js';
export { NoopMeteringProvider } from './types.js';
export { ConsoleMeteringProvider } from './console.js';
export {
  UsageMeteringProvider,
  type UsageMeteringProviderOptions,
  type UsageRollup,
} from './usage.js';
