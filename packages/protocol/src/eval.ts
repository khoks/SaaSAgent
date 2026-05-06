/**
 * Eval signal protocol — Phase 2.5.
 *
 * Per ADR-032: every layout the agent emits should be scoreable. Eval signals
 * are the primary feedback channel — they capture how the user (or the system)
 * felt about a particular composeCycleId, so the agent can be tuned over time.
 *
 * Three sources contribute signals:
 *   • user-explicit  — user clicked a feedback widget (thumbs up/down)
 *   • user-implicit  — derived from behavior (re-ask within N sec, abandonment)
 *   • system         — runtime-inferred (planner failed, tool returned error)
 *
 * Signal kinds are deliberately coarse for MVP. Phase 2.6 (VoC + Customer Churn
 * ML) will sharpen these into per-intent scoring + cohort analysis.
 */

export type EvalSignalKind =
  /** Positive — explicit thumbs up, primary CTA click, task completion. */
  | 'positive'
  /** Negative — explicit thumbs down, dismissal, re-ask within window. */
  | 'negative'
  /** Neutral — viewed but no action; explicit "skip"; low-confidence outcome. */
  | 'neutral'
  /** Task explicitly completed — strong positive (purchase, booking, save). */
  | 'completion';

export type EvalSource =
  /** User clicked a feedback affordance directly. */
  | 'user-explicit'
  /** Inferred from user behavior (re-ask, dwell time, bounce). */
  | 'user-implicit'
  /** Runtime-inferred (planner failure, tool error, validation reject). */
  | 'system';

export interface EvalSignal {
  /** The layout being scored — must match a previously broadcast ComposedLayout.composeCycleId. */
  composeCycleId: string;
  /** Logical session id (matches the WS-assigned sessionId in Phase 2.3). */
  sessionId?: string;
  /** User id when known (cross-session continuity, per ADR-032). */
  userId?: string;
  /** Coarse-grained signal kind. */
  signal: EvalSignalKind;
  /** Where the signal came from. */
  source: EvalSource;
  /**
   * Optional fine-grained numeric score in [0, 1]. Aggregators may compute
   * this from richer signals downstream (ClickHouse rollups, ML model output).
   */
  score?: number;
  /** Free-text comment from the user (for explicit feedback widgets with a text field). */
  comment?: string;
  /** The intent the layout was rendered for — useful for per-intent scoring. */
  intent?: string;
  /** ISO-8601 timestamp the signal was emitted. */
  at: string;
}
