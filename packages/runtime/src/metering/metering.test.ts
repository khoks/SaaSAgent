import { describe, it, expect, vi } from 'vitest';
import { NoopMeteringProvider, ConsoleMeteringProvider, UsageMeteringProvider } from './index.js';

describe('NoopMeteringProvider', () => {
  it('drops events and never throws', () => {
    const p = new NoopMeteringProvider();
    expect(() => p.record({ kind: 'plan_invocation' })).not.toThrow();
  });
});

describe('ConsoleMeteringProvider', () => {
  it('emits one JSON line per event', () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((s) => lines.push(String(s)));
    const p = new ConsoleMeteringProvider();
    p.record({ kind: 'compose_invocation', tenantId: 'acme', tags: { model: 'haiku' } });
    spy.mockRestore();
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed).toMatchObject({ _kind: 'metering', kind: 'compose_invocation', tenantId: 'acme' });
    expect(parsed.tags).toEqual({ model: 'haiku' });
    expect(parsed.at).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('UsageMeteringProvider', () => {
  it('rolls events into per-(kind, tenantId, tags) buckets', () => {
    const p = new UsageMeteringProvider({ now: () => '2026-01-01T00:00:00Z' });
    p.record({ kind: 'plan_invocation', tenantId: 'acme' });
    p.record({ kind: 'plan_invocation', tenantId: 'acme' });
    p.record({ kind: 'plan_invocation', tenantId: 'beta' });
    const snap = p.snapshot();
    expect(snap).toHaveLength(2);
    const acme = snap.find((r) => r.tenantId === 'acme')!;
    expect(acme.count).toBe(2);
    expect(acme.totalQuantity).toBe(2);
  });

  it('sums quantity across events', () => {
    const p = new UsageMeteringProvider();
    p.record({ kind: 'model_tokens', quantity: 1000 });
    p.record({ kind: 'model_tokens', quantity: 2500 });
    const snap = p.snapshot();
    expect(snap[0]!.totalQuantity).toBe(3500);
    expect(snap[0]!.count).toBe(2);
  });

  it('keeps separate buckets for distinct tag combinations', () => {
    const p = new UsageMeteringProvider();
    p.record({ kind: 'compose_invocation', tags: { model: 'haiku' } });
    p.record({ kind: 'compose_invocation', tags: { model: 'sonnet' } });
    expect(p.size()).toBe(2);
  });

  it('records firstAt + lastAt timestamps', () => {
    let ticks = ['2026-01-01T00:00:00Z', '2026-01-01T00:00:05Z', '2026-01-01T00:00:10Z'];
    const p = new UsageMeteringProvider({ now: () => ticks.shift()! });
    p.record({ kind: 'plan_invocation', tenantId: 'acme' });
    p.record({ kind: 'plan_invocation', tenantId: 'acme' });
    p.record({ kind: 'plan_invocation', tenantId: 'acme' });
    const r = p.snapshot()[0]!;
    expect(r.firstAt).toBe('2026-01-01T00:00:00Z');
    expect(r.lastAt).toBe('2026-01-01T00:00:10Z');
  });

  it('reset() drops all rollups', () => {
    const p = new UsageMeteringProvider();
    p.record({ kind: 'plan_invocation' });
    p.record({ kind: 'compose_invocation' });
    expect(p.size()).toBe(2);
    p.reset();
    expect(p.size()).toBe(0);
    expect(p.snapshot()).toEqual([]);
  });

  it('honors maxBuckets cap with FIFO eviction', () => {
    const p = new UsageMeteringProvider({ maxBuckets: 3 });
    for (let i = 0; i < 5; i++) {
      p.record({ kind: 'plan_invocation', tags: { i: String(i) } });
    }
    expect(p.size()).toBe(3);
  });

  it('snapshot returns immutable copies (mutating shouldn\'t affect internal state)', () => {
    const p = new UsageMeteringProvider();
    p.record({ kind: 'plan_invocation', tenantId: 'acme', tags: { model: 'haiku' } });
    const snap = p.snapshot();
    expect(() => {
      (snap[0]!.tags as Record<string, unknown>).model = 'mutated';
    }).not.toThrow(); // shallow tags object is a copy, mutating it is local
    const second = p.snapshot();
    // Internal state preserved — second snapshot still has 'haiku'.
    expect((second[0]!.tags as Record<string, unknown>).model).toBe('haiku');
  });
});
