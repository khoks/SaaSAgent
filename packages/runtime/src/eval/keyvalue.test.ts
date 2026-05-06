import { describe, it, expect } from 'vitest';
import type { EvalSignal } from '@saasagent/protocol';
import { KeyValueEvalProvider } from './keyvalue.js';

const sig = (over: Partial<EvalSignal> = {}): EvalSignal => ({
  composeCycleId: 'cyc-1',
  signal: 'positive',
  source: 'user-explicit',
  at: '2026-01-01T00:00:00Z',
  ...over,
});

describe('KeyValueEvalProvider', () => {
  it('reports its name + zero count initially', () => {
    const p = new KeyValueEvalProvider();
    expect(p.name).toBe('keyvalue');
    expect(p.count()).toBe(0);
  });

  it('records signals and counts them', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig());
    await p.record(sig({ composeCycleId: 'cyc-2' }));
    expect(p.count()).toBe(2);
  });

  it('queries by sessionId', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig({ sessionId: 's1' }));
    await p.record(sig({ sessionId: 's2', composeCycleId: 'cyc-2' }));
    const r = await p.query({ sessionId: 's1' });
    expect(r).toHaveLength(1);
    expect(r[0]!.sessionId).toBe('s1');
  });

  it('queries by composeCycleId', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig({ composeCycleId: 'a' }));
    await p.record(sig({ composeCycleId: 'b' }));
    const r = await p.query({ composeCycleId: 'a' });
    expect(r).toHaveLength(1);
    expect(r[0]!.composeCycleId).toBe('a');
  });

  it('queries by signal kind', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig({ signal: 'positive' }));
    await p.record(sig({ composeCycleId: 'cyc-2', signal: 'negative' }));
    await p.record(sig({ composeCycleId: 'cyc-3', signal: 'completion' }));
    const r = await p.query({ signal: 'negative' });
    expect(r).toHaveLength(1);
    expect(r[0]!.signal).toBe('negative');
  });

  it('queries by since (ISO comparison, inclusive)', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig({ at: '2026-01-01T00:00:00Z' }));
    await p.record(sig({ at: '2026-01-02T00:00:00Z', composeCycleId: 'cyc-2' }));
    await p.record(sig({ at: '2026-01-03T00:00:00Z', composeCycleId: 'cyc-3' }));
    const r = await p.query({ since: '2026-01-02T00:00:00Z' });
    expect(r.map((s) => s.composeCycleId).sort()).toEqual(['cyc-2', 'cyc-3']);
  });

  it('returns most-recent-first (reverse insertion order)', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig({ composeCycleId: 'a', at: '2026-01-01T00:00:00Z' }));
    await p.record(sig({ composeCycleId: 'b', at: '2026-01-02T00:00:00Z' }));
    await p.record(sig({ composeCycleId: 'c', at: '2026-01-03T00:00:00Z' }));
    const r = await p.query({});
    expect(r.map((s) => s.composeCycleId)).toEqual(['c', 'b', 'a']);
  });

  it('respects limit', async () => {
    const p = new KeyValueEvalProvider({ defaultQueryLimit: 2 });
    for (let i = 0; i < 5; i++) {
      await p.record(sig({ composeCycleId: `c-${i}` }));
    }
    const r = await p.query({});
    expect(r).toHaveLength(2);
  });

  it('caps storage at maxSignals (FIFO eviction)', async () => {
    const p = new KeyValueEvalProvider({ maxSignals: 3 });
    for (let i = 0; i < 7; i++) {
      await p.record(sig({ composeCycleId: `c-${i}` }));
    }
    expect(p.count()).toBe(3);
    const r = await p.query({});
    // Only c-4, c-5, c-6 remain — most-recent-first gives c-6 first.
    expect(r.map((s) => s.composeCycleId)).toEqual(['c-6', 'c-5', 'c-4']);
  });

  it('combines multiple filters (AND)', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig({ sessionId: 's1', signal: 'positive', composeCycleId: 'a' }));
    await p.record(sig({ sessionId: 's1', signal: 'negative', composeCycleId: 'b' }));
    await p.record(sig({ sessionId: 's2', signal: 'positive', composeCycleId: 'c' }));
    const r = await p.query({ sessionId: 's1', signal: 'positive' });
    expect(r).toHaveLength(1);
    expect(r[0]!.composeCycleId).toBe('a');
  });

  it('clear() drops all signals', async () => {
    const p = new KeyValueEvalProvider();
    await p.record(sig());
    await p.record(sig());
    p.clear();
    expect(p.count()).toBe(0);
    expect(await p.query({})).toEqual([]);
  });
});
