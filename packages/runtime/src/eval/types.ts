/**
 * EvalProvider — Phase 2.5 substrate.
 *
 * Pluggable interface for capturing + querying eval signals. The KeyValue
 * implementation in Phase 2.5 keeps everything in-process; future
 * ClickHouseEvalProvider (Phase 2.5.x) writes to ClickHouse for persistent
 * analytics + RLHF feedback loops per ADR-032.
 *
 * Same seam pattern as MemoryProvider — the runtime's REST endpoints + WS
 * intercept call .record() the same way regardless of the underlying store.
 */

import type { EvalSignal, EvalSignalKind } from '@saasagent/protocol';

export interface EvalFilter {
  sessionId?: string;
  composeCycleId?: string;
  signal?: EvalSignalKind;
  /** ISO-8601 inclusive lower bound. */
  since?: string;
  /** Max results. Default 100 in KeyValueEvalProvider. */
  limit?: number;
}

export interface EvalProvider {
  /** Provider name for logging / observability. */
  readonly name: string;
  /**
   * Record a signal. Implementations may persist async; resolved Promise just
   * means the call was accepted, not that it has been durably written.
   */
  record(signal: EvalSignal): Promise<void>;
  /** Query stored signals. */
  query(filter: EvalFilter): Promise<ReadonlyArray<EvalSignal>>;
  /** Total signals captured (for /health observability). */
  count(): number;
}
