/**
 * KeyValueEvalProvider — Phase 2.5 default.
 *
 * In-process append-only list of EvalSignals. Bounded at maxSignals (default
 * 10000) with FIFO eviction once the cap is hit. Query is a linear scan
 * filtered by (sessionId, composeCycleId, signal, since, limit) — adequate for
 * dev/single-tenant. ClickHouse impl in Phase 2.5.x replaces this for
 * production-scale analytics.
 *
 * Recall: signals are emitted by:
 *   • REST POST /eval               — explicit user signals from any client
 *   • WS  type='eval-feedback'      — explicit user signals from the shell
 *   • System auto-record on planner errors → 'negative'/system in 2.5.x
 */

import type { EvalSignal } from '@saasagent/protocol';

import type { EvalFilter, EvalProvider } from './types.js';

export interface KeyValueEvalProviderOptions {
  /** Max signals retained (FIFO eviction beyond). Default 10000. */
  maxSignals?: number;
  /** Default query limit when EvalFilter.limit isn't set. Default 100. */
  defaultQueryLimit?: number;
}

export class KeyValueEvalProvider implements EvalProvider {
  readonly name = 'keyvalue';
  private readonly signals: EvalSignal[] = [];
  private readonly maxSignals: number;
  private readonly defaultQueryLimit: number;

  constructor(options: KeyValueEvalProviderOptions = {}) {
    this.maxSignals = options.maxSignals ?? 10000;
    this.defaultQueryLimit = options.defaultQueryLimit ?? 100;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async record(signal: EvalSignal): Promise<void> {
    this.signals.push(signal);
    if (this.signals.length > this.maxSignals) {
      this.signals.splice(0, this.signals.length - this.maxSignals);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async query(filter: EvalFilter): Promise<ReadonlyArray<EvalSignal>> {
    const matched: EvalSignal[] = [];
    for (const s of this.signals) {
      if (filter.sessionId && s.sessionId !== filter.sessionId) continue;
      if (filter.composeCycleId && s.composeCycleId !== filter.composeCycleId) continue;
      if (filter.signal && s.signal !== filter.signal) continue;
      if (filter.since && s.at < filter.since) continue;
      matched.push(s);
    }
    const limit = filter.limit ?? this.defaultQueryLimit;
    // Return most-recent-first — `signals` is push-only, so the tail is newest.
    return matched.slice(-limit).reverse();
  }

  count(): number {
    return this.signals.length;
  }

  /** Inspection helper — clear all captured signals. */
  clear(): void {
    this.signals.length = 0;
  }
}
