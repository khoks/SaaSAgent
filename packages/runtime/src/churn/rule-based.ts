/**
 * RuleBasedChurnCalculator — Phase 2.6 v0 implementation.
 *
 * Reads EvalSignals from an EvalProvider and computes a churn-risk score per
 * session via rule-based aggregates. The math is deliberately simple — it's a
 * starting point a Phase 2.6.x ML model will replace once we have enough
 * labeled data.
 *
 * Risk score formula (each contributes 0..0.5, capped at 1.0):
 *
 *   negative_ratio_factor    = (negative_count + 0.5*neutral_count) / total_count
 *   no_completion_factor     = 0.5 if completion_count == 0 else 0.0
 *   recent_negative_factor   = 0.3 if last 3 signals contain ≥2 negative else 0.0
 *
 *   score = clamp(negative_ratio_factor*0.6 + no_completion_factor*0.5 + recent_negative_factor, 0, 1)
 *
 * Bucketing:
 *   score < 0.3  → 'low'
 *   score < 0.6  → 'medium'
 *   score >= 0.6 → 'high'
 *
 * Factors array names which rules fired so the host can surface them in
 * admin dashboards / win-back workflows.
 */

import type { ChurnRiskLevel, ChurnRiskScore, EvalSignal } from '@saasagent/protocol';

import type { EvalProvider } from '../eval/index.js';

import type { ChurnRiskCalculator } from './types.js';

export interface RuleBasedChurnCalculatorOptions {
  evalProvider: EvalProvider;
  /** Min signals required before producing a score. Default 1. */
  minSignals?: number;
}

export class RuleBasedChurnCalculator implements ChurnRiskCalculator {
  readonly name = 'rule-based-v0';
  private readonly minSignals: number;

  constructor(private readonly options: RuleBasedChurnCalculatorOptions) {
    this.minSignals = options.minSignals ?? 1;
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

  private compute(sessionId: string, signalsInput: ReadonlyArray<EvalSignal>): ChurnRiskScore {
    // computeForSession passed limit:1000 with most-recent-first ordering from
    // KeyValueEvalProvider — flip to chronological for "recent N" math.
    const signals = [...signalsInput].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    const total = signals.length;
    const counts = { positive: 0, negative: 0, neutral: 0, completion: 0 };
    for (const s of signals) counts[s.signal] += 1;

    const factors: string[] = [];

    // 1. Negative-ratio factor (neutrals count half).
    const negativeRatio = (counts.negative + 0.5 * counts.neutral) / Math.max(total, 1);
    if (counts.negative > 0) {
      factors.push(
        `${counts.negative}/${total} signals were negative (ratio ${negativeRatio.toFixed(2)})`,
      );
    }

    // 2. No-completion factor.
    let noCompletionContrib = 0;
    if (counts.completion === 0 && total >= 2) {
      noCompletionContrib = 0.5;
      factors.push('no completion signals across the session');
    } else if (counts.completion > 0) {
      factors.push(`${counts.completion} task completion signal(s)`);
    }

    // 3. Recent-negative factor — last 3 signals.
    const tail = signals.slice(-3);
    const recentNeg = tail.filter((s) => s.signal === 'negative').length;
    let recentNegContrib = 0;
    if (recentNeg >= 2 && tail.length >= 2) {
      recentNegContrib = 0.3;
      factors.push(`recent ${recentNeg}-of-${tail.length} signals were negative (trending down)`);
    }

    const raw = negativeRatio * 0.6 + noCompletionContrib * 0.5 + recentNegContrib;
    const score = Math.max(0, Math.min(1, raw));

    let riskLevel: ChurnRiskLevel = 'low';
    if (score >= 0.6) riskLevel = 'high';
    else if (score >= 0.3) riskLevel = 'medium';

    return {
      sessionId,
      score: Number(score.toFixed(3)),
      riskLevel,
      signalsAnalyzed: total,
      factors,
      computedAt: new Date().toISOString(),
      model: this.name,
    };
  }
}
