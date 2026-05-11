/**
 * Tier/quota provider — Phase 7.
 *
 * Per ADR-019, the platform supports an end-user tier/quota concept that is
 * separate from the open-core pricing model (ADR-020 / MeteringProvider).
 * Where MeteringProvider records billable events for the *host enterprise's*
 * pricing pipeline, TierProvider enforces per-user request limits *inside*
 * the host's deployment — host's own users get tiered access to the agent
 * (free / pro / etc.), with visible "X requests remaining" affordance.
 *
 * Provider-shape:
 *   • `resolveTier(userId)` returns the user's tier id (default tier if not
 *     explicitly assigned). Hosts override to read from their own user DB.
 *   • `check(userId)` reports current quota state without consuming.
 *   • `consume(userId)` deducts one request from the user's daily quota and
 *     returns the post-consume state, including `allowed: false` if the limit
 *     was reached. The runtime calls this on user-message arrival.
 *   • Optional `listTiers()` exposes tier definitions for /health surfacing
 *     and admin tooling.
 *
 * Reset semantics: implementations choose the reset period (daily UTC for the
 * MVP InMemoryTierProvider). `resetAtUtc` in QuotaCheckResult tells the shell
 * when to expect the limit to refill so it can render the resetting time.
 *
 * Implementations:
 *   • NoQuotaProvider       — unlimited, default. Skips all checks.
 *   • InMemoryTierProvider  — host-configured tier defs + per-user usage in
 *                              a Map keyed by userId. UTC-day reset.
 */

export interface TierDefinition {
  /** Tier identifier — 'free' / 'pro' / 'enterprise' / etc. Must be unique. */
  id: string;
  /** Human-readable label rendered in the UI. */
  label: string;
  /**
   * Hard cap on requests per reset window. -1 means unlimited.
   * 'request' = one user-message that triggers the planner (not every emit).
   */
  dailyRequests: number;
}

export interface QuotaCheckResult {
  /** Did this check pass? (`consume` flips to false at the limit; `check` only reports.) */
  allowed: boolean;
  /** The user's resolved tier id (e.g. 'free'). */
  tier: string;
  /** Requests consumed in the current window. */
  used: number;
  /** Tier's hard limit. Infinity if unlimited. */
  limit: number;
  /** limit - used. Infinity if unlimited. Never negative. */
  remaining: number;
  /** ISO-8601 timestamp of the next window reset. */
  resetAtUtc: string;
  /** Populated when allowed=false. Machine-readable code. */
  reason?: 'quota-exceeded' | 'tier-not-found' | 'provider-error';
}

export interface TierProvider {
  readonly name: string;
  /** Resolve a user's tier id. Default tier returned for unknown users. */
  resolveTier(userId: string): string | Promise<string>;
  /** Report current quota state without consuming. */
  check(userId: string): QuotaCheckResult | Promise<QuotaCheckResult>;
  /** Deduct one request. Returns post-consume state (may be allowed=false). */
  consume(userId: string): QuotaCheckResult | Promise<QuotaCheckResult>;
  /** Optional: list configured tier definitions (for /health + admin). */
  listTiers?(): readonly TierDefinition[];
  /** Optional: reset a user's quota (admin / tests). */
  reset?(userId: string): void | Promise<void>;
}

/**
 * Default provider — no quotas, every request allowed. Used when host does
 * not configure a TierProvider. `check()` and `consume()` both return
 * unlimited state.
 */
export class NoQuotaProvider implements TierProvider {
  readonly name = 'noquota';
  resolveTier(): string {
    return 'unlimited';
  }
  check(): QuotaCheckResult {
    return {
      allowed: true,
      tier: 'unlimited',
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      resetAtUtc: '9999-12-31T23:59:59.999Z',
    };
  }
  consume(): QuotaCheckResult {
    return this.check();
  }
}
