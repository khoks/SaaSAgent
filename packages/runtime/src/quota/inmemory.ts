/**
 * InMemoryTierProvider — Phase 7 MVP TierProvider.
 *
 * In-process, configurable tier definitions + per-user usage map. UTC-day
 * reset boundary. Suitable for single-process deployments + tests; production
 * hosts override with a provider backed by their own user DB + Redis/PG.
 *
 * Configuration:
 *   new InMemoryTierProvider({
 *     defaultTier: 'free',
 *     tiers: [
 *       { id: 'free', label: 'Free', dailyRequests: 10 },
 *       { id: 'pro',  label: 'Pro',  dailyRequests: 200 },
 *     ],
 *     userTiers: { 'alice@x.com': 'pro' },
 *   });
 *
 * Reset behavior: every `consume` / `check` computes today's UTC date string
 * and clears the user's counter if it differs from the stored date. So a user
 * who hits 10/10 on day N can send their 11th on day N+1 with no admin work.
 */

import type {
  TierDefinition,
  TierProvider,
  QuotaCheckResult,
} from './types.js';

export interface InMemoryTierProviderOptions {
  /** Tier id assigned to users not in `userTiers`. Must exist in `tiers`. */
  defaultTier: string;
  /** All configured tier definitions. */
  tiers: ReadonlyArray<TierDefinition>;
  /** Optional explicit user → tier assignments. */
  userTiers?: Readonly<Record<string, string>>;
  /** Override time source for tests. Defaults to () => new Date(). */
  now?: () => Date;
}

interface UserUsageRow {
  /** UTC date string the count is for ('2026-05-11'). */
  date: string;
  used: number;
}

function todayUtc(now: Date): string {
  // Format YYYY-MM-DD in UTC. Locale-independent.
  return now.toISOString().slice(0, 10);
}

function nextResetIso(now: Date): string {
  // Tomorrow 00:00:00.000 UTC.
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString();
}

export class InMemoryTierProvider implements TierProvider {
  readonly name = 'in-memory-tier';
  private readonly defaultTierId: string;
  private readonly tiers: Map<string, TierDefinition>;
  private readonly userTiers: Map<string, string>;
  private readonly usage: Map<string, UserUsageRow> = new Map();
  private readonly nowFn: () => Date;

  constructor(opts: InMemoryTierProviderOptions) {
    this.tiers = new Map(opts.tiers.map((t) => [t.id, t]));
    if (!this.tiers.has(opts.defaultTier)) {
      throw new Error(
        `[InMemoryTierProvider] defaultTier '${opts.defaultTier}' not found in tiers — must be one of: ${[...this.tiers.keys()].join(', ')}`,
      );
    }
    this.defaultTierId = opts.defaultTier;
    this.userTiers = new Map(Object.entries(opts.userTiers ?? {}));
    this.nowFn = opts.now ?? ((): Date => new Date());
  }

  resolveTier(userId: string): string {
    return this.userTiers.get(userId) ?? this.defaultTierId;
  }

  listTiers(): readonly TierDefinition[] {
    return [...this.tiers.values()];
  }

  reset(userId: string): void {
    this.usage.delete(userId);
  }

  check(userId: string): QuotaCheckResult {
    const tierId = this.resolveTier(userId);
    const tier = this.tiers.get(tierId);
    if (!tier) {
      return {
        allowed: false,
        tier: tierId,
        used: 0,
        limit: 0,
        remaining: 0,
        resetAtUtc: nextResetIso(this.nowFn()),
        reason: 'tier-not-found',
      };
    }
    const row = this.getOrInitRow(userId);
    const limit = tier.dailyRequests < 0 ? Infinity : tier.dailyRequests;
    const remaining = Math.max(0, limit - row.used);
    return {
      allowed: tier.dailyRequests < 0 ? true : row.used < tier.dailyRequests,
      tier: tierId,
      used: row.used,
      limit,
      remaining,
      resetAtUtc: nextResetIso(this.nowFn()),
    };
  }

  consume(userId: string): QuotaCheckResult {
    const tierId = this.resolveTier(userId);
    const tier = this.tiers.get(tierId);
    if (!tier) {
      return {
        allowed: false,
        tier: tierId,
        used: 0,
        limit: 0,
        remaining: 0,
        resetAtUtc: nextResetIso(this.nowFn()),
        reason: 'tier-not-found',
      };
    }
    const row = this.getOrInitRow(userId);
    // Unlimited tier — track for visibility but always allow.
    if (tier.dailyRequests < 0) {
      row.used += 1;
      return {
        allowed: true,
        tier: tierId,
        used: row.used,
        limit: Infinity,
        remaining: Infinity,
        resetAtUtc: nextResetIso(this.nowFn()),
      };
    }
    // At-or-over-limit — reject without incrementing further (counter is
    // already at limit; bumping past it would mislead the next check).
    if (row.used >= tier.dailyRequests) {
      return {
        allowed: false,
        tier: tierId,
        used: row.used,
        limit: tier.dailyRequests,
        remaining: 0,
        resetAtUtc: nextResetIso(this.nowFn()),
        reason: 'quota-exceeded',
      };
    }
    row.used += 1;
    return {
      allowed: true,
      tier: tierId,
      used: row.used,
      limit: tier.dailyRequests,
      remaining: tier.dailyRequests - row.used,
      resetAtUtc: nextResetIso(this.nowFn()),
    };
  }

  private getOrInitRow(userId: string): UserUsageRow {
    const today = todayUtc(this.nowFn());
    let row = this.usage.get(userId);
    if (!row || row.date !== today) {
      row = { date: today, used: 0 };
      this.usage.set(userId, row);
    }
    return row;
  }
}
