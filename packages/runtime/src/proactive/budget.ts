/**
 * InMemoryAttentionBudget — Phase 5.
 *
 * Per-session counter with a hard cap. Atomic try-consume so two concurrent
 * proactive ticks can't double-spend. In-process Map — sufficient for
 * single-runtime deployments. Multi-runtime / sticky-session deployments
 * substitute a Redis-backed implementation behind the same interface.
 */

import type { AttentionBudget } from './types.js';

export interface InMemoryAttentionBudgetOptions {
  /** Max proactive surfacings per session. Default 3. */
  perSessionMax?: number;
}

export class InMemoryAttentionBudget implements AttentionBudget {
  readonly perSessionMax: number;
  private readonly used = new Map<string, number>();

  constructor(opts: InMemoryAttentionBudgetOptions = {}) {
    this.perSessionMax = opts.perSessionMax ?? 3;
  }

  tryConsume(sessionId: string): boolean {
    const cur = this.used.get(sessionId) ?? 0;
    if (cur >= this.perSessionMax) return false;
    this.used.set(sessionId, cur + 1);
    return true;
  }

  remaining(sessionId: string): number {
    return Math.max(0, this.perSessionMax - (this.used.get(sessionId) ?? 0));
  }

  reset(sessionId?: string): void {
    if (sessionId === undefined) this.used.clear();
    else this.used.delete(sessionId);
  }
}
