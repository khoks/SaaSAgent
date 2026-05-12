/**
 * DefaultProactiveScorer — Phase 5 linear-weighted scorer.
 *
 * Combines the five signals from ADR-018 as a weighted sum, capped at 1.0.
 * Weights are tunable per host. The default weights bias toward
 * planner-confidence (the strongest predictive signal in practice) and
 * deemphasize raw time-since (which dominates in trivial schemes).
 *
 * Pure function; matches the same explainability pattern used by the
 * weighted-feature churn calculator (ADR-031 / P-005): per-signal
 * contributions = weight × value, summing to score. Future ML scorers
 * implementing ProactiveScorer can swap in without changing call sites.
 */

import type {
  ProactiveContext,
  ProactiveScore,
  ProactiveScorer,
  ProactiveSignalName,
} from './types.js';

export type ProactiveWeights = Record<ProactiveSignalName, number>;

export const DEFAULT_PROACTIVE_WEIGHTS: ProactiveWeights = {
  plannerConfidence: 0.35,
  memoryMatch: 0.2,
  workflowContinuity: 0.2,
  domRelevance: 0.15,
  timeSinceLastTouch: 0.1,
};

export interface DefaultProactiveScorerOptions {
  /** Override the per-signal weights. Defaults above. */
  weights?: Partial<ProactiveWeights>;
}

export class DefaultProactiveScorer implements ProactiveScorer {
  readonly name = 'default-proactive-v0';
  private readonly weights: ProactiveWeights;

  constructor(opts: DefaultProactiveScorerOptions = {}) {
    this.weights = { ...DEFAULT_PROACTIVE_WEIGHTS, ...(opts.weights ?? {}) };
  }

  score(ctx: ProactiveContext): ProactiveScore {
    const signals = ctx.signals;
    const factors: Partial<Record<ProactiveSignalName, number>> = {};
    let total = 0;
    const rationaleParts: string[] = [];
    (Object.keys(this.weights) as ProactiveSignalName[]).forEach((sig) => {
      const v = clamp01(signals[sig] ?? 0);
      const contribution = this.weights[sig] * v;
      factors[sig] = round3(contribution);
      total += contribution;
      if (v > 0) rationaleParts.push(`${sig}=${v.toFixed(2)}(×${this.weights[sig].toFixed(2)})`);
    });
    const score = clamp01(total);
    return {
      score: round3(score),
      factors,
      rationale: rationaleParts.length === 0 ? 'no signals present' : rationaleParts.join('; '),
    };
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
