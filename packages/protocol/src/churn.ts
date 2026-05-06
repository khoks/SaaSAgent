/**
 * Customer churn risk protocol — Phase 2.6.
 *
 * Per ADR-032: closed-loop VoC + Customer Churn ML pulled into MVP. VoC is
 * already captured via Phase 2.5 eval signals. This layer derives a per-session
 * churn-risk score from those signals.
 *
 * MVP ships RuleBasedChurnCalculator (statistical aggregates of eval signals).
 * Phase 2.6.x will add a real ML model behind the same ChurnRiskCalculator
 * interface — the rule-based version becomes the fallback when the model has
 * insufficient signal volume.
 */

export type ChurnRiskLevel = 'low' | 'medium' | 'high';

export interface ChurnRiskScore {
  /** Session this score is for. */
  sessionId: string;
  /** Continuous risk in [0, 1]. Higher = more likely to churn. */
  score: number;
  /** Discretized bucket for UI/alerting. */
  riskLevel: ChurnRiskLevel;
  /** Total eval signals consulted. */
  signalsAnalyzed: number;
  /**
   * Human-readable reasons that contributed to the score. The host can
   * surface these in admin dashboards or pipe them into win-back workflows.
   */
  factors: ReadonlyArray<string>;
  /** ISO-8601 wall-clock the score was computed. */
  computedAt: string;
  /** Optional model name + version that produced this score (for cohort analysis). */
  model?: string;
}
