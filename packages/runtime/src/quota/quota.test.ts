import { describe, it, expect } from 'vitest';
import { InMemoryTierProvider } from './inmemory.js';
import { NoQuotaProvider } from './types.js';

describe('NoQuotaProvider', () => {
  it('reports unlimited for every user', () => {
    const p = new NoQuotaProvider();
    const r = p.check();
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(Infinity);
    expect(r.remaining).toBe(Infinity);
  });
  it('consume always allows', () => {
    const p = new NoQuotaProvider();
    for (let i = 0; i < 1000; i++) expect(p.consume().allowed).toBe(true);
  });
});

describe('InMemoryTierProvider', () => {
  const fixedNow = new Date('2026-05-11T10:00:00.000Z');
  const make = (userTiers?: Record<string, string>): InMemoryTierProvider =>
    new InMemoryTierProvider({
      defaultTier: 'free',
      tiers: [
        { id: 'free', label: 'Free', dailyRequests: 3 },
        { id: 'pro', label: 'Pro', dailyRequests: 100 },
        { id: 'enterprise', label: 'Enterprise', dailyRequests: -1 },
      ],
      ...(userTiers ? { userTiers } : {}),
      now: () => fixedNow,
    });

  it('rejects construction when defaultTier missing from tiers', () => {
    expect(
      () =>
        new InMemoryTierProvider({
          defaultTier: 'platinum',
          tiers: [{ id: 'free', label: 'Free', dailyRequests: 10 }],
        }),
    ).toThrow(/defaultTier/);
  });

  it('resolves to defaultTier for unknown users; explicit user override wins', () => {
    const p = make({ 'alice@x.com': 'pro' });
    expect(p.resolveTier('bob@x.com')).toBe('free');
    expect(p.resolveTier('alice@x.com')).toBe('pro');
  });

  it('check() reports used=0, remaining=limit on first lookup', () => {
    const r = make().check('u1');
    expect(r.used).toBe(0);
    expect(r.remaining).toBe(3);
    expect(r.limit).toBe(3);
    expect(r.allowed).toBe(true);
    expect(r.tier).toBe('free');
    expect(r.resetAtUtc).toBe('2026-05-12T00:00:00.000Z');
  });

  it('consume() decrements remaining and flips allowed=false at the limit', () => {
    const p = make();
    expect(p.consume('u1').remaining).toBe(2);
    expect(p.consume('u1').remaining).toBe(1);
    const r3 = p.consume('u1');
    expect(r3.remaining).toBe(0);
    expect(r3.allowed).toBe(true);
    const r4 = p.consume('u1');
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toBe('quota-exceeded');
    expect(r4.used).toBe(3); // not incremented past the limit
  });

  it('unlimited tier (-1) keeps allowed=true and increments used for observability', () => {
    const p = make({ root: 'enterprise' });
    const r1 = p.consume('root');
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(Infinity);
    expect(r1.used).toBe(1);
    for (let i = 0; i < 50; i++) expect(p.consume('root').allowed).toBe(true);
  });

  it('per-user usage isolated', () => {
    const p = make();
    p.consume('u1');
    p.consume('u1');
    p.consume('u1');
    expect(p.consume('u1').allowed).toBe(false);
    expect(p.consume('u2').allowed).toBe(true);
  });

  it('resets at UTC day boundary', () => {
    let clock = new Date('2026-05-11T23:59:59.000Z');
    const p = new InMemoryTierProvider({
      defaultTier: 'free',
      tiers: [{ id: 'free', label: 'Free', dailyRequests: 2 }],
      now: () => clock,
    });
    p.consume('u1');
    p.consume('u1');
    expect(p.consume('u1').allowed).toBe(false);
    // Advance one second past midnight UTC.
    clock = new Date('2026-05-12T00:00:01.000Z');
    const r = p.consume('u1');
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
    expect(r.remaining).toBe(1);
  });

  it('reset() clears a user state', () => {
    const p = make();
    p.consume('u1');
    p.consume('u1');
    p.reset('u1');
    expect(p.check('u1').used).toBe(0);
  });

  it('listTiers() returns the configured tier defs', () => {
    const tiers = make().listTiers();
    expect(tiers).toHaveLength(3);
    expect(tiers.find((t) => t.id === 'pro')?.dailyRequests).toBe(100);
  });

  it('tier-not-found is reported (not thrown) when userTiers maps to bogus id', () => {
    // Construct via a private cast — exercises the defensive path in case of
    // mis-configured runtime DB.
    const p = new InMemoryTierProvider({
      defaultTier: 'free',
      tiers: [{ id: 'free', label: 'Free', dailyRequests: 5 }],
      userTiers: { weird: 'ghost-tier' },
    });
    const r = p.consume('weird');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('tier-not-found');
  });
});
