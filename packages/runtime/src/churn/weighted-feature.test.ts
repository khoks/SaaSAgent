import { describe, it, expect } from 'vitest';
import type { EvalSignal } from '@saasagent/protocol';

import { KeyValueEvalProvider } from '../eval/index.js';
import {
  DEFAULT_WEIGHTS,
  WeightedFeatureChurnCalculator,
} from './weighted-feature.js';

const sig = (over: Partial<EvalSignal> = {}): EvalSignal => ({
  composeCycleId: `cyc-${Math.random().toString(36).slice(2, 8)}`,
  sessionId: 's1',
  signal: 'positive',
  source: 'user-explicit',
  at: '2026-01-01T00:00:00Z',
  ...over,
});

async function setup(signals: ReadonlyArray<EvalSignal>): Promise<{
  evalProvider: KeyValueEvalProvider;
  calc: WeightedFeatureChurnCalculator;
}> {
  const evalProvider = new KeyValueEvalProvider();
  for (const s of signals) await evalProvider.record(s);
  return { evalProvider, calc: new WeightedFeatureChurnCalculator({ evalProvider }) };
}

describe('WeightedFeatureChurnCalculator', () => {
  it('reports its model name (overridable)', () => {
    const ep = new KeyValueEvalProvider();
    expect(new WeightedFeatureChurnCalculator({ evalProvider: ep }).name).toBe('weighted-feature-v0');
    expect(
      new WeightedFeatureChurnCalculator({ evalProvider: ep, modelName: 'custom-v3' }).name,
    ).toBe('custom-v3');
  });

  it('returns null below minSignals', async () => {
    const { calc } = await setup([]);
    expect(await calc.computeForSession('nobody')).toBeNull();
    const calc2 = new WeightedFeatureChurnCalculator({
      evalProvider: new KeyValueEvalProvider(),
      minSignals: 5,
    });
    expect(await calc2.computeForSession('s1')).toBeNull();
  });

  it('extractFeatures returns zero vector on empty input', () => {
    const calc = new WeightedFeatureChurnCalculator({ evalProvider: new KeyValueEvalProvider() });
    expect(calc.extractFeatures([])).toEqual({
      negativeRatio: 0,
      noCompletion: 0,
      recentNegative: 0,
      avgScoreInverted: 0,
      logSessionLength: 0,
    });
  });

  it('extractFeatures: negativeRatio counts neutrals at half weight', () => {
    const calc = new WeightedFeatureChurnCalculator({ evalProvider: new KeyValueEvalProvider() });
    const f = calc.extractFeatures([
      sig({ signal: 'negative' }),
      sig({ signal: 'neutral' }),
      sig({ signal: 'positive' }),
      sig({ signal: 'positive' }),
    ]);
    // (1 + 0.5*1) / 4 = 0.375
    expect(f.negativeRatio).toBeCloseTo(0.375, 3);
  });

  it('extractFeatures: noCompletion=1 only when comp=0 AND total>=2', () => {
    const calc = new WeightedFeatureChurnCalculator({ evalProvider: new KeyValueEvalProvider() });
    expect(calc.extractFeatures([sig({ signal: 'positive' })]).noCompletion).toBe(0);
    expect(calc.extractFeatures([sig({ signal: 'positive' }), sig({ signal: 'positive' })]).noCompletion).toBe(1);
    expect(
      calc.extractFeatures([sig({ signal: 'completion' }), sig({ signal: 'positive' })]).noCompletion,
    ).toBe(0);
  });

  it('extractFeatures: recentNegative looks at last-3 window', () => {
    const calc = new WeightedFeatureChurnCalculator({ evalProvider: new KeyValueEvalProvider() });
    const f = calc.extractFeatures([
      sig({ signal: 'positive', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'positive', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:02:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:03:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:04:00Z' }),
    ]);
    expect(f.recentNegative).toBeCloseTo(1.0, 3); // 3/3
  });

  it('extractFeatures: avgScoreInverted = 1 - avg(scored signals); 0 when none scored', () => {
    const calc = new WeightedFeatureChurnCalculator({ evalProvider: new KeyValueEvalProvider() });
    expect(calc.extractFeatures([sig({})]).avgScoreInverted).toBe(0);
    const f = calc.extractFeatures([
      sig({ score: 0.2 }),
      sig({ score: 0.4 }),
      sig({}), // no score → ignored
    ]);
    // avg=(0.2+0.4)/2=0.3 → inverted=0.7
    expect(f.avgScoreInverted).toBeCloseTo(0.7, 3);
  });

  it('extractFeatures: logSessionLength = log10(n+1)/2', () => {
    const calc = new WeightedFeatureChurnCalculator({ evalProvider: new KeyValueEvalProvider() });
    expect(calc.extractFeatures([sig({})]).logSessionLength).toBeCloseTo(Math.log10(2) / 2, 3);
    expect(calc.extractFeatures(Array.from({ length: 99 }, () => sig({}))).logSessionLength).toBeCloseTo(1, 3);
  });

  it('computes a low score for an all-positive session with completion', async () => {
    const { calc } = await setup([
      sig({ signal: 'positive', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'positive', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'completion', at: '2026-01-01T00:02:00Z' }),
    ]);
    const r = (await calc.computeForSession('s1'))!;
    expect(r.riskLevel).toBe('low');
    expect(r.score).toBeLessThan(0.3);
  });

  it('computes a high score for an all-negative session', async () => {
    const { calc } = await setup([
      sig({ signal: 'negative', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:02:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:03:00Z' }),
    ]);
    const r = (await calc.computeForSession('s1'))!;
    expect(r.riskLevel).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(0.6);
  });

  it('factors lists per-feature contributions sorted by magnitude DESC', async () => {
    const { calc } = await setup([
      sig({ signal: 'negative', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:02:00Z' }),
    ]);
    const r = (await calc.computeForSession('s1'))!;
    // The negativeRatio contribution should beat noCompletion at 1.0 weight
    // since neg_ratio=1.0 * weight 4.0 = 4.0.
    expect(r.factors[0]).toMatch(/^negativeRatio=/);
    expect(r.factors).toContain(
      `bias=${DEFAULT_WEIGHTS.bias.toFixed(2)}; weighted_sum=${(
        DEFAULT_WEIGHTS.bias +
        DEFAULT_WEIGHTS.negativeRatio * 1 +
        DEFAULT_WEIGHTS.noCompletion * 1 +
        DEFAULT_WEIGHTS.recentNegative * 1 +
        DEFAULT_WEIGHTS.logSessionLength * (Math.log10(4) / 2)
      ).toFixed(2)}; sigmoid=${r.score.toFixed(3)}`,
    );
  });

  it('honors custom weights', async () => {
    const evalProvider = new KeyValueEvalProvider();
    await evalProvider.record(sig({ signal: 'negative', at: '2026-01-01T00:00:00Z' }));
    await evalProvider.record(sig({ signal: 'negative', at: '2026-01-01T00:01:00Z' }));
    // Crank negativeRatio weight up; expect higher score than default.
    const aggressive = new WeightedFeatureChurnCalculator({
      evalProvider,
      weights: { negativeRatio: 12 }, // overrides default 4
    });
    const tame = new WeightedFeatureChurnCalculator({ evalProvider });
    const a = (await aggressive.computeForSession('s1'))!;
    const t = (await tame.computeForSession('s1'))!;
    expect(a.score).toBeGreaterThan(t.score);
  });

  it('computeAll groups by session and sorts by score DESC', async () => {
    const evalProvider = new KeyValueEvalProvider();
    await evalProvider.record(sig({ sessionId: 'good', signal: 'positive', at: '2026-01-01T00:00:00Z' }));
    await evalProvider.record(sig({ sessionId: 'good', signal: 'completion', at: '2026-01-01T00:01:00Z' }));
    await evalProvider.record(sig({ sessionId: 'bad', signal: 'negative', at: '2026-01-01T00:00:00Z' }));
    await evalProvider.record(sig({ sessionId: 'bad', signal: 'negative', at: '2026-01-01T00:01:00Z' }));
    await evalProvider.record(sig({ sessionId: 'bad', signal: 'negative', at: '2026-01-01T00:02:00Z' }));
    const calc = new WeightedFeatureChurnCalculator({ evalProvider });
    const all = await calc.computeAll();
    expect(all).toHaveLength(2);
    expect(all[0]!.sessionId).toBe('bad');
    expect(all[0]!.score).toBeGreaterThan(all[1]!.score);
  });

  it('attributes the model name in ChurnRiskScore', async () => {
    const { calc } = await setup([sig({ signal: 'positive' })]);
    const r = (await calc.computeForSession('s1'))!;
    expect(r.model).toBe('weighted-feature-v0');
  });

  it('score is rounded to 3dp and inside [0, 1]', async () => {
    const { calc } = await setup([
      sig({ signal: 'negative' }),
      sig({ signal: 'positive', at: '2026-01-01T00:01:00Z' }),
    ]);
    const r = (await calc.computeForSession('s1'))!;
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    const decimals = String(r.score).split('.')[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(3);
  });
});
