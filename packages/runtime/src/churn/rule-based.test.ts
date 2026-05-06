import { describe, it, expect } from 'vitest';
import type { EvalSignal } from '@saasagent/protocol';

import { KeyValueEvalProvider } from '../eval/index.js';
import { RuleBasedChurnCalculator } from './rule-based.js';

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
  calc: RuleBasedChurnCalculator;
}> {
  const evalProvider = new KeyValueEvalProvider();
  for (const s of signals) await evalProvider.record(s);
  return { evalProvider, calc: new RuleBasedChurnCalculator({ evalProvider }) };
}

describe('RuleBasedChurnCalculator', () => {
  it('reports its name', () => {
    const { calc } = {
      calc: new RuleBasedChurnCalculator({ evalProvider: new KeyValueEvalProvider() }),
    };
    expect(calc.name).toBe('rule-based-v0');
  });

  it('returns null for sessions with no signals', async () => {
    const { calc } = await setup([]);
    const r = await calc.computeForSession('nobody');
    expect(r).toBeNull();
  });

  it('computes low risk for a session of all-positive signals', async () => {
    const { calc } = await setup([
      sig({ signal: 'positive', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'positive', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'completion', at: '2026-01-01T00:02:00Z' }),
    ]);
    const r = await calc.computeForSession('s1');
    expect(r).not.toBeNull();
    expect(r!.score).toBeLessThan(0.3);
    expect(r!.riskLevel).toBe('low');
    expect(r!.signalsAnalyzed).toBe(3);
    expect(r!.factors.some((f) => f.includes('completion'))).toBe(true);
  });

  it('computes high risk when most signals are negative AND no completion', async () => {
    const { calc } = await setup([
      sig({ signal: 'negative', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:02:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:03:00Z' }),
    ]);
    const r = await calc.computeForSession('s1');
    expect(r!.score).toBeGreaterThanOrEqual(0.6);
    expect(r!.riskLevel).toBe('high');
    expect(r!.factors.some((f) => f.includes('negative'))).toBe(true);
    expect(r!.factors.some((f) => f.includes('no completion'))).toBe(true);
  });

  it('flags recent-trending-negative when last 3 of 4+ signals were negative', async () => {
    const { calc } = await setup([
      sig({ signal: 'positive', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'positive', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:02:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:03:00Z' }),
      sig({ signal: 'negative', at: '2026-01-01T00:04:00Z' }),
    ]);
    const r = await calc.computeForSession('s1');
    expect(r!.factors.some((f) => f.includes('trending down'))).toBe(true);
  });

  it('attributes the model name (for cohort analysis)', async () => {
    const { calc } = await setup([sig({ signal: 'positive' })]);
    const r = await calc.computeForSession('s1');
    expect(r!.model).toBe('rule-based-v0');
  });

  it('respects minSignals threshold (returns null below)', async () => {
    const evalProvider = new KeyValueEvalProvider();
    await evalProvider.record(sig({ signal: 'positive' }));
    const calc = new RuleBasedChurnCalculator({ evalProvider, minSignals: 5 });
    const r = await calc.computeForSession('s1');
    expect(r).toBeNull();
  });

  it('computeAll returns scores per session, sorted by score descending', async () => {
    const evalProvider = new KeyValueEvalProvider();
    // Session A — all positive (low risk)
    await evalProvider.record(sig({ sessionId: 'a', signal: 'positive', at: '2026-01-01T00:00:00Z' }));
    await evalProvider.record(sig({ sessionId: 'a', signal: 'completion', at: '2026-01-01T00:01:00Z' }));
    // Session B — all negative (high risk)
    await evalProvider.record(sig({ sessionId: 'b', signal: 'negative', at: '2026-01-01T00:00:00Z' }));
    await evalProvider.record(sig({ sessionId: 'b', signal: 'negative', at: '2026-01-01T00:01:00Z' }));
    await evalProvider.record(sig({ sessionId: 'b', signal: 'negative', at: '2026-01-01T00:02:00Z' }));
    const calc = new RuleBasedChurnCalculator({ evalProvider });
    const all = await calc.computeAll();
    expect(all).toHaveLength(2);
    // Highest-risk first → b before a
    expect(all[0]!.sessionId).toBe('b');
    expect(all[1]!.sessionId).toBe('a');
    expect(all[0]!.score).toBeGreaterThan(all[1]!.score);
  });

  it('computeAll groups orphan signals (no sessionId) under __no_session__', async () => {
    const evalProvider = new KeyValueEvalProvider();
    await evalProvider.record(sig({ sessionId: undefined, signal: 'negative' }));
    await evalProvider.record(sig({ sessionId: undefined, signal: 'negative', at: '2026-01-01T00:01:00Z' }));
    const calc = new RuleBasedChurnCalculator({ evalProvider });
    const all = await calc.computeAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.sessionId).toBe('__no_session__');
  });

  it('rounds score to 3 decimal places', async () => {
    const { calc } = await setup([
      sig({ signal: 'negative', at: '2026-01-01T00:00:00Z' }),
      sig({ signal: 'positive', at: '2026-01-01T00:01:00Z' }),
      sig({ signal: 'positive', at: '2026-01-01T00:02:00Z' }),
    ]);
    const r = await calc.computeForSession('s1');
    expect(Number.isFinite(r!.score)).toBe(true);
    // Check no more than 3 decimal places
    const s = String(r!.score);
    if (s.includes('.')) {
      const decimals = s.split('.')[1]!.length;
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });

  it('computedAt is a valid ISO timestamp', async () => {
    const { calc } = await setup([sig({ signal: 'positive' })]);
    const r = await calc.computeForSession('s1');
    expect(() => new Date(r!.computedAt).toISOString()).not.toThrow();
  });
});
