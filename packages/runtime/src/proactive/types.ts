/**
 * Proactive engine — Phase 5 / ADR-018.
 *
 * Multi-signal scoring + attention-budget enforcement for unprompted agent
 * surfacings. The runtime watches a session's signals (user idle time, DOM
 * activity, recent eval outcomes, time since last proactive, etc.) and
 * computes a per-tick score. When the score crosses a host-configured
 * threshold AND the session still has attention budget remaining, the
 * engine emits a proactive layout (and decrements the budget).
 *
 * The five signals from ADR-018:
 *   1. plannerConfidence    — how confident is the planner there's a
 *                              useful next-best-action right now?
 *   2. memoryMatch          — does recent context match a memory entry
 *                              suggesting an NBA?
 *   3. workflowContinuity   — is the user mid-flow (carted but not checked
 *                              out; searched but not booked; etc.)?
 *   4. domRelevance         — does the visible page topic match anything
 *                              the agent could meaningfully add?
 *   5. timeSinceLastTouch   — proactive intrusions soon after a prior turn
 *                              are annoying; long gaps invite re-engagement.
 *
 * Each signal is normalized 0..1 by its producer. The default scorer
 * combines them as a weighted sum capped at 1.0 (tunable per host).
 * Hosts that want ML-driven scoring later (LightGBM, etc.) implement the
 * `ProactiveScorer` interface and swap in via configuration.
 *
 * Budget contract: per-session counter. Default 3 proactive interventions
 * per session. The shell-side renderer marks each impression with the
 * cycleId so eval-feedback envelopes can be attributed back to the
 * proactive turn (closing the loop with EvalProvider + ChurnRiskCalculator).
 */

export type ProactiveSignalName =
  | 'plannerConfidence'
  | 'memoryMatch'
  | 'workflowContinuity'
  | 'domRelevance'
  | 'timeSinceLastTouch';

/**
 * Snapshot of the inputs the scorer evaluates on each tick. All values are
 * 0..1; missing values are treated as 0 by the default scorer.
 */
export interface ProactiveContext {
  /** Stable session id (per-WS connection). */
  sessionId: string;
  /** ISO-8601 of this tick. */
  at: string;
  /** Per-signal value in 0..1. Missing keys count as 0. */
  signals: Partial<Record<ProactiveSignalName, number>>;
  /** Free-form metadata the scorer / engine may consult or surface. */
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Output of one scoring pass. The engine consumes `score` to decide whether
 * to surface a proactive; `factors` is the per-signal contribution surfaced
 * for observability + the patent-explainability story (ties into ADR-031).
 */
export interface ProactiveScore {
  /** 0..1 overall propensity to surface a proactive now. */
  score: number;
  /** Per-signal contributions summing to (approximately) score. */
  factors: Partial<Record<ProactiveSignalName, number>>;
  /** Free-text rationale the dashboard / debug surface can render. */
  rationale: string;
}

/** Pluggable scorer (linear sum default; future ML scorer here too). */
export interface ProactiveScorer {
  readonly name: string;
  /** Pure — same input → same output, < 1 ms. */
  score(ctx: ProactiveContext): ProactiveScore;
}

/**
 * Per-session attention budget — caps how often the agent can surface
 * unprompted in a single session. Reset on disconnect (re-connect = new
 * session at the per-WS state level).
 */
export interface AttentionBudget {
  readonly perSessionMax: number;
  /** Try to consume one budget unit; returns true if granted, false if exhausted. */
  tryConsume(sessionId: string): boolean;
  /** Inspect remaining budget for a session. */
  remaining(sessionId: string): number;
  /** Reset (admin / tests). */
  reset?(sessionId?: string): void;
}

/**
 * Engine contract — orchestrates the scorer + budget. The RuntimeServer
 * runs an idle-tick loop per-WS that calls `evaluate`; on a "fire" return
 * the server composes a proactive layout and broadcasts it.
 */
export interface ProactiveEngine {
  readonly name: string;
  readonly threshold: number;
  readonly budget: AttentionBudget;
  readonly scorer: ProactiveScorer;
  /**
   * Run the scorer on the given context. Returns:
   *   • { fire: true, score, suggestedIntent } when score >= threshold AND budget grants
   *   • { fire: false, score, reason } otherwise
   * `tryConsume` is called ONLY when both conditions pass, so a denied
   * decision never burns budget.
   */
  evaluate(ctx: ProactiveContext): ProactiveDecision;
}

export type ProactiveDecision =
  | {
      fire: true;
      score: ProactiveScore;
      /**
       * Intent label the runtime forwards to the composer
       * (e.g. 'proactive:bundle-savings-nudge'). The composer picks a
       * template via the cached-templates path (ADR-012).
       */
      suggestedIntent: string;
    }
  | {
      fire: false;
      score: ProactiveScore;
      reason: 'below-threshold' | 'budget-exhausted';
    };
