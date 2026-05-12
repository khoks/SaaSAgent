import { describe, it, expect } from 'vitest';
import {
  DefaultProactiveScorer,
  DEFAULT_PROACTIVE_WEIGHTS,
} from './scorer.js';
import { InMemoryAttentionBudget } from './budget.js';
import { DefaultProactiveEngine } from './engine.js';
import type { ProactiveContext } from './types.js';

function ctx(sigs: ProactiveContext['signals'] = {}): ProactiveContext {
  return { sessionId: 's1', at: new Date().toISOString(), signals: sigs };
}

describe('DefaultProactiveScorer', () => {
  it('returns 0 when no signals', () => {
    const r = new DefaultProactiveScorer().score(ctx({}));
    expect(r.score).toBe(0);
    expect(r.rationale).toBe('no signals present');
  });

  it('returns 1 when all signals are 1 (weights sum to 1)', () => {
    const sum = Object.values(DEFAULT_PROACTIVE_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
    const r = new DefaultProactiveScorer().score(
      ctx({
        plannerConfidence: 1,
        memoryMatch: 1,
        workflowContinuity: 1,
        domRelevance: 1,
        timeSinceLastTouch: 1,
      }),
    );
    expect(r.score).toBe(1);
  });

  it('per-signal factors equal weight × value', () => {
    const r = new DefaultProactiveScorer().score(
      ctx({ plannerConfidence: 0.5, memoryMatch: 1 }),
    );
    // plannerConfidence: 0.35 * 0.5 = 0.175
    // memoryMatch:        0.20 * 1   = 0.2
    expect(r.factors.plannerConfidence).toBeCloseTo(0.175, 3);
    expect(r.factors.memoryMatch).toBeCloseTo(0.2, 3);
    expect(r.score).toBeCloseTo(0.375, 3);
  });

  it('clamps invalid signals to 0..1', () => {
    const r = new DefaultProactiveScorer().score(
      ctx({ plannerConfidence: 2, memoryMatch: -1, domRelevance: Number.NaN }),
    );
    // plannerConfidence clamped to 1 → 0.35 * 1
    // memoryMatch clamped to 0
    // domRelevance NaN → 0
    expect(r.factors.plannerConfidence).toBeCloseTo(0.35, 3);
    expect(r.factors.memoryMatch).toBe(0);
    expect(r.factors.domRelevance).toBe(0);
  });

  it('accepts custom weights', () => {
    const s = new DefaultProactiveScorer({
      weights: { plannerConfidence: 1, memoryMatch: 0, workflowContinuity: 0, domRelevance: 0, timeSinceLastTouch: 0 },
    });
    const r = s.score(ctx({ plannerConfidence: 0.8, memoryMatch: 1 }));
    expect(r.score).toBeCloseTo(0.8, 3);
  });
});

describe('InMemoryAttentionBudget', () => {
  it('grants up to perSessionMax consumes, then denies', () => {
    const b = new InMemoryAttentionBudget({ perSessionMax: 2 });
    expect(b.tryConsume('s1')).toBe(true);
    expect(b.tryConsume('s1')).toBe(true);
    expect(b.tryConsume('s1')).toBe(false);
    expect(b.remaining('s1')).toBe(0);
  });

  it('isolates per-session budgets', () => {
    const b = new InMemoryAttentionBudget({ perSessionMax: 1 });
    expect(b.tryConsume('s1')).toBe(true);
    expect(b.tryConsume('s2')).toBe(true);
    expect(b.tryConsume('s1')).toBe(false);
    expect(b.remaining('s2')).toBe(0);
  });

  it('reset() clears per-session or all', () => {
    const b = new InMemoryAttentionBudget({ perSessionMax: 1 });
    b.tryConsume('s1');
    b.tryConsume('s2');
    b.reset('s1');
    expect(b.tryConsume('s1')).toBe(true);
    expect(b.tryConsume('s2')).toBe(false);
    b.reset();
    expect(b.tryConsume('s2')).toBe(true);
  });
});

describe('DefaultProactiveEngine', () => {
  it('fire=false reason=below-threshold when score under threshold', () => {
    const e = new DefaultProactiveEngine({ threshold: 0.6 });
    const r = e.evaluate(ctx({ plannerConfidence: 0.3 })); // 0.35 * 0.3 = 0.105
    expect(r.fire).toBe(false);
    if (!r.fire) expect(r.reason).toBe('below-threshold');
  });

  it('fire=true at-or-above threshold; consumes budget once', () => {
    const e = new DefaultProactiveEngine({ threshold: 0.5 });
    const r = e.evaluate(
      ctx({ plannerConfidence: 1, memoryMatch: 1, workflowContinuity: 1 }),
    ); // 0.35 + 0.20 + 0.20 = 0.75
    expect(r.fire).toBe(true);
    if (r.fire) {
      expect(r.suggestedIntent).toBe('proactive-nudge');
      expect(r.score.score).toBeCloseTo(0.75, 3);
    }
    expect(e.budget.remaining('s1')).toBe(2);
  });

  it('fire=false reason=budget-exhausted after perSessionMax fires', () => {
    const e = new DefaultProactiveEngine({
      threshold: 0.4,
      budget: new InMemoryAttentionBudget({ perSessionMax: 2 }),
    });
    expect(e.evaluate(ctx({ plannerConfidence: 1, memoryMatch: 1 })).fire).toBe(true);
    expect(e.evaluate(ctx({ plannerConfidence: 1, memoryMatch: 1 })).fire).toBe(true);
    const r3 = e.evaluate(ctx({ plannerConfidence: 1, memoryMatch: 1 }));
    expect(r3.fire).toBe(false);
    if (!r3.fire) expect(r3.reason).toBe('budget-exhausted');
  });

  it('does NOT consume budget when below threshold (denial paths are cheap)', () => {
    const e = new DefaultProactiveEngine({
      threshold: 0.9,
      budget: new InMemoryAttentionBudget({ perSessionMax: 1 }),
    });
    e.evaluate(ctx({ plannerConfidence: 0.1 }));
    e.evaluate(ctx({ plannerConfidence: 0.1 }));
    e.evaluate(ctx({ plannerConfidence: 0.1 }));
    expect(e.budget.remaining('s1')).toBe(1);
  });

  it('allows custom suggestedIntent for per-deployment proactive templates', () => {
    const e = new DefaultProactiveEngine({
      threshold: 0.1,
      suggestedIntent: 'expedia:bundle-savings-nudge',
    });
    const r = e.evaluate(ctx({ plannerConfidence: 1 }));
    expect(r.fire).toBe(true);
    if (r.fire) expect(r.suggestedIntent).toBe('expedia:bundle-savings-nudge');
  });
});
