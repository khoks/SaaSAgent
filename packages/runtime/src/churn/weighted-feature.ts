/**
 * WeightedFeatureChurnCalculator — Phase 2.6.x.
 *
 * Parameterized linear model over numeric features extracted from a session's
 * eval signals. Step toward Phase 2.7+ ML — same architecture as a logistic
 * regression, just with hand-tuned default weights since we don't have labeled
 * training data yet. When a host accumulates labeled sessions (churned vs
 * retained), they can fit weights via standard logreg + drop them in via the
 * `weights` constructor option without changing this class.
 *
 * Pipeline:
 *
 *   eval_signals → extractFeatures(signals) → FeatureVector { f1..fN }
 *                  ↓
 *   weighted_sum = w0 + Σ wi * fi
 *                  ↓
 *   score = sigmoid(weighted_sum)  ∈ (0, 1)
 *
 * The output ChurnRiskScore exposes the per-feature contributions in `factors`
 * so the score is explainable — not a black box. Each contribution is sorted
 * by magnitude so the top driver of risk is first.
 */

import type { ChurnRiskLevel, ChurnRiskScore, EvalSignal } from '@saasagent/protocol';

import type { EvalProvider } from '../eval/index.js';

import type { ChurnRiskCalculator } from './types.js';

/** Numeric feature vector extracted from a session's signals. */
export interface FeatureVector {
  /** (negative + 0.5*neutral) / total, or 0 when total=0. */
  negativeRatio: number;
  /** 1 when no 'completion' signal seen AND total >= 2, else 0. */
  noCompletion: number;
  /** Negative count in the last 3 signals divided by min(3, total). */
  recentNegative: number;
  /** 1 - avg(score) over signals with explicit score field; 0 when no scored signals. */
  avgScoreInverted: number;
  /** log10(total + 1), normalized by 2 (so ~0.5 at 100 signals). */
  logSessionLength: number;
}

/** Tunable weights — defaults are hand-calibrated; replace with logreg fits when labels exist. */
export interface ChurnWeights {
  /** Bias term (intercept). */
  bias: number;
  negativeRatio: number;
  noCompletion: number;
  recentNegative: number;
  avgScoreInverted: number;
  logSessionLength: number;
}

/**
 * Hand-tuned defaults that produce roughly RuleBasedChurnCalculator-like
 * behavior. Negative bias keeps the floor low; positive coefficients push
 * the score up when a feature fires.
 *
 *   bias ≈ -2.5         → empty/clean session ≈ sigmoid(-2.5) = 0.076 (low)
 *   neg_ratio   = 4.0   → all-negative session: +4.0 → +1.5 net → sigmoid ≈ 0.82
 *   no_comp     = 1.0   → multi-turn no-completion: +1 → moderate bump
 *   recent_neg  = 1.5   → recent trend amplifier
 *   avg_score_i = 1.0   → inverse explicit score signal
 *   log_len     = 0.3   → slight signal-volume bonus (more confidence)
 */
export const DEFAULT_WEIGHTS: ChurnWeights = {
  bias: -2.5,
  negativeRatio: 4.0,
  noCompletion: 1.0,
  recentNegative: 1.5,
  avgScoreInverted: 1.0,
  logSessionLength: 0.3,
};

export interface WeightedFeatureChurnCalculatorOptions {
  evalProvider: EvalProvider;
  /** Min signals before producing a score. Default 1. */
  minSignals?: number;
  /** Override the default weights. Useful when training data is available. */
  weights?: Partial<ChurnWeights>;
  /** Override calculator name (default 'weighted-feature-v0'). */
  modelName?: string;
}

export class WeightedFeatureChurnCalculator implements ChurnRiskCalculator {
  readonly name: string;
  private readonly weights: ChurnWeights;
  private readonly minSignals: number;

  constructor(private readonly options: WeightedFeatureChurnCalculatorOptions) {
    this.weights = { ...DEFAULT_WEIGHTS, ...(options.weights ?? {}) };
    this.minSignals = options.minSignals ?? 1;
    this.name = options.modelName ?? 'weighted-feature-v0';
  }

  async computeForSession(sessionId: string): Promise<ChurnRiskScore | null> {
    const signals = await this.options.evalProvider.query({ sessionId, limit: 1000 });
    if (signals.length < this.minSignals) return null;
    return this.compute(sessionId, signals);
  }

  async computeAll(): Promise<ReadonlyArray<ChurnRiskScore>> {
    const all = await this.options.evalProvider.query({ limit: 10000 });
    const bySession = new Map<string, EvalSignal[]>();
    for (const s of all) {
      const sid = s.sessionId ?? '__no_session__';
      const list = bySession.get(sid) ?? [];
      list.push(s);
      bySession.set(sid, list);
    }
    const out: ChurnRiskScore[] = [];
    for (const [sid, signals] of bySession.entries()) {
      if (signals.length < this.minSignals) continue;
      out.push(this.compute(sid, signals));
    }
    return out.sort((a, b) => b.score - a.score);
  }

  /** Public for tests + hosts that want to inspect the model's intermediate state. */
  extractFeatures(signalsInput: ReadonlyArray<EvalSignal>): FeatureVector {
    const signals = [...signalsInput].sort((a, b) =>
      a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
    );
    const total = signals.length;
    if (total === 0) {
      return {
        negativeRatio: 0,
        noCompletion: 0,
        recentNegative: 0,
        avgScoreInverted: 0,
        logSessionLength: 0,
      };
    }
    let neg = 0;
    let neu = 0;
    let comp = 0;
    let scoreSum = 0;
    let scoreN = 0;
    for (const s of signals) {
      if (s.signal === 'negative') neg += 1;
      else if (s.signal === 'neutral') neu += 1;
      else if (s.signal === 'completion') comp += 1;
      if (typeof s.score === 'number') {
        scoreSum += s.score;
        scoreN += 1;
      }
    }
    const tail = signals.slice(-3);
    const recentNeg = tail.filter((s) => s.signal === 'negative').length;
    return {
      negativeRatio: (neg + 0.5 * neu) / total,
      noCompletion: comp === 0 && total >= 2 ? 1 : 0,
      recentNegative: recentNeg / Math.max(tail.length, 1),
      avgScoreInverted: scoreN > 0 ? 1 - scoreSum / scoreN : 0,
      logSessionLength: Math.log10(total + 1) / 2,
    };
  }

  private compute(sessionId: string, signals: ReadonlyArray<EvalSignal>): ChurnRiskScore {
    const f = this.extractFeatures(signals);
    const w = this.weights;
    // Per-feature contributions (excluding bias) so we can rank them in `factors`.
    const contribs: Array<{ name: string; value: number; contribution: number }> = [
      { name: 'negativeRatio', value: f.negativeRatio, contribution: w.negativeRatio * f.negativeRatio },
      { name: 'noCompletion', value: f.noCompletion, contribution: w.noCompletion * f.noCompletion },
      { name: 'recentNegative', value: f.recentNegative, contribution: w.recentNegative * f.recentNegative },
      { name: 'avgScoreInverted', value: f.avgScoreInverted, contribution: w.avgScoreInverted * f.avgScoreInverted },
      { name: 'logSessionLength', value: f.logSessionLength, contribution: w.logSessionLength * f.logSessionLength },
    ];
    const weightedSum = w.bias + contribs.reduce((acc, c) => acc + c.contribution, 0);
    const score = Number(sigmoid(weightedSum).toFixed(3));

    let riskLevel: ChurnRiskLevel = 'low';
    if (score >= 0.6) riskLevel = 'high';
    else if (score >= 0.3) riskLevel = 'medium';

    // Build factors array — top contributors first, then a stable summary line.
    const positiveContribs = contribs
      .filter((c) => c.contribution > 0.01)
      .sort((a, b) => b.contribution - a.contribution)
      .map(
        (c) => `${c.name}=${c.value.toFixed(2)} → +${c.contribution.toFixed(2)} (weight ${weightLabel(c.name, w)})`,
      );
    const factors = [
      ...positiveContribs,
      `bias=${w.bias.toFixed(2)}; weighted_sum=${weightedSum.toFixed(2)}; sigmoid=${score.toFixed(3)}`,
    ];

    return {
      sessionId,
      score,
      riskLevel,
      signalsAnalyzed: signals.length,
      factors,
      computedAt: new Date().toISOString(),
      model: this.name,
    };
  }
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function weightLabel(name: string, w: ChurnWeights): string {
  const v = w[name as keyof Omit<ChurnWeights, 'bias'>];
  return typeof v === 'number' ? v.toFixed(2) : String(v);
}
