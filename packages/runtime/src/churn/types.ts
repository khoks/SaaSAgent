/**
 * ChurnRiskCalculator — Phase 2.6.
 *
 * Pluggable interface — Phase 2.6 ships RuleBasedChurnCalculator; Phase 2.6.x
 * will swap in an ML model behind the same interface (rule-based becomes
 * fallback for cold-start sessions with insufficient signal volume).
 */

import type { ChurnRiskScore } from '@saasagent/protocol';

export interface ChurnRiskCalculator {
  /** Calculator name (for /health + score.model attribution). */
  readonly name: string;
  /**
   * Compute a churn-risk score for one session by reading recent eval signals.
   * Returns null when there's nothing to score (no signals at all).
   */
  computeForSession(sessionId: string): Promise<ChurnRiskScore | null>;
  /**
   * Compute scores across every session that has ≥1 eval signal.
   * Useful for admin dashboards / batch alerting.
   */
  computeAll(): Promise<ReadonlyArray<ChurnRiskScore>>;
}
