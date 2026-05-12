import { describe, it, expect } from 'vitest';
import {
  InMemoryCapabilityEvalRunner,
  outcomeSuccessCheck,
  outputNonEmptyCheck,
  makeLatencyBudgetCheck,
  defaultHeuristicSuite,
  type CapabilityInvocationRecord,
} from './index.js';

function rec(overrides: Partial<CapabilityInvocationRecord> = {}): CapabilityInvocationRecord {
  return {
    name: 'expedia.search-flights',
    kind: 'skill',
    at: new Date().toISOString(),
    ok: true,
    durationMs: 50,
    output: { count: 3 },
    ...overrides,
  };
}

describe('heuristic checks', () => {
  describe('outcomeSuccessCheck', () => {
    it('scores 1 on ok=true', () => {
      const r = outcomeSuccessCheck.evaluate(rec({ ok: true }));
      expect(r.score).toBe(1);
    });
    it('scores 0 on ok=false and includes error code', () => {
      const r = outcomeSuccessCheck.evaluate(
        rec({ ok: false, errorCode: 'handler-threw', errorMessage: 'boom' }),
      );
      expect(r.score).toBe(0);
      expect(r.detail).toContain('handler-threw');
      expect(r.detail).toContain('boom');
    });
  });

  describe('outputNonEmptyCheck', () => {
    it('scores 1 on populated output', () => {
      expect(outputNonEmptyCheck.evaluate(rec({ output: { x: 1 } })).score).toBe(1);
    });
    it('scores 0 on empty object', () => {
      expect(outputNonEmptyCheck.evaluate(rec({ output: {} })).score).toBe(0);
    });
    it('scores 0 on empty array', () => {
      expect(outputNonEmptyCheck.evaluate(rec({ output: [] })).score).toBe(0);
    });
    it('scores 0 on null/undefined', () => {
      expect(outputNonEmptyCheck.evaluate(rec({ output: null })).score).toBe(0);
      expect(outputNonEmptyCheck.evaluate(rec({ output: undefined })).score).toBe(0);
    });
    it('scores 0 (skipped) on ok=false', () => {
      const r = outputNonEmptyCheck.evaluate(rec({ ok: false }));
      expect(r.score).toBe(0);
      expect(r.detail).toContain('skipped');
    });
  });

  describe('latency-budget', () => {
    const check = makeLatencyBudgetCheck({ targetMs: 100 });
    it('scores 1 at or under target', () => {
      expect(check.evaluate(rec({ durationMs: 50 })).score).toBe(1);
      expect(check.evaluate(rec({ durationMs: 100 })).score).toBe(1);
    });
    it('degrades linearly past target', () => {
      // 200ms = target + 1*target → score ≈ 1 - 1/3 = 0.666
      const r = check.evaluate(rec({ durationMs: 200 }));
      expect(r.score).toBeCloseTo(0.667, 2);
    });
    it('floors to 0 at 4×target', () => {
      expect(check.evaluate(rec({ durationMs: 400 })).score).toBe(0);
      expect(check.evaluate(rec({ durationMs: 5000 })).score).toBe(0);
    });
  });
});

describe('InMemoryCapabilityEvalRunner', () => {
  it('returns null report for an unknown capability', () => {
    const r = new InMemoryCapabilityEvalRunner();
    expect(r.reportFor('does-not-exist')).toBeNull();
  });

  it('aggregates per-capability metrics from recorded invocations', () => {
    const r = new InMemoryCapabilityEvalRunner({ latencyTargetMs: 100 });
    r.recordInvocation(rec({ name: 'a', durationMs: 50, ok: true, output: { x: 1 } }));
    r.recordInvocation(rec({ name: 'a', durationMs: 200, ok: true, output: { x: 2 } }));
    r.recordInvocation(rec({ name: 'a', durationMs: 80, ok: false, errorCode: 'handler-threw' }));
    const rep = r.reportFor('a')!;
    expect(rep.totalInvocations).toBe(3);
    expect(rep.okCount).toBe(2);
    expect(rep.failureCount).toBe(1);
    expect(rep.successRate).toBeCloseTo(2 / 3, 5);
    expect(rep.medianLatencyMs).toBe(80);
    expect(rep.p95LatencyMs).toBe(200);
    expect(rep.perCheck['outcome-success']!.mean).toBeCloseTo(2 / 3, 5);
    expect(rep.perCheck['latency-budget']!.sampleSize).toBe(3);
    expect(rep.overallScore).not.toBeNull();
    expect(rep.lastSeenAt).toBeDefined();
  });

  it('isolates buckets per-capability', () => {
    const r = new InMemoryCapabilityEvalRunner();
    r.recordInvocation(rec({ name: 'a', ok: true }));
    r.recordInvocation(rec({ name: 'b', ok: false, errorCode: 'unknown-skill' }));
    expect(r.reportFor('a')!.successRate).toBe(1);
    expect(r.reportFor('b')!.successRate).toBe(0);
  });

  it('reportAll() sorts worst-first by overallScore', () => {
    const r = new InMemoryCapabilityEvalRunner();
    r.recordInvocation(rec({ name: 'good', ok: true, output: { x: 1 } }));
    r.recordInvocation(rec({ name: 'bad', ok: false, errorCode: 'handler-threw' }));
    const reports = r.reportAll();
    expect(reports.map((r) => r.name)).toEqual(['bad', 'good']);
  });

  it('ring buffer evicts oldest beyond bufferSize', () => {
    const r = new InMemoryCapabilityEvalRunner({ bufferSize: 3 });
    for (let i = 0; i < 5; i++) {
      r.recordInvocation(rec({ name: 'a', durationMs: 10 * i }));
    }
    const rep = r.reportFor('a')!;
    expect(rep.totalInvocations).toBe(3);
    // After eviction the buffer holds durations [20, 30, 40] → median 30.
    expect(rep.medianLatencyMs).toBe(30);
  });

  it('reset() clears buckets', () => {
    const r = new InMemoryCapabilityEvalRunner();
    r.recordInvocation(rec());
    expect(r.reportAll()).toHaveLength(1);
    r.reset();
    expect(r.reportAll()).toHaveLength(0);
  });

  it('defaultHeuristicSuite has 3 checks', () => {
    expect(defaultHeuristicSuite()).toHaveLength(3);
  });

  it('handles capabilities of all three kinds', () => {
    const r = new InMemoryCapabilityEvalRunner();
    r.recordInvocation(rec({ name: 's', kind: 'skill' }));
    r.recordInvocation(rec({ name: 't', kind: 'tool' }));
    r.recordInvocation(rec({ name: 'a', kind: 'subagent' }));
    expect(r.reportFor('s')!.kind).toBe('skill');
    expect(r.reportFor('t')!.kind).toBe('tool');
    expect(r.reportFor('a')!.kind).toBe('subagent');
  });
});
