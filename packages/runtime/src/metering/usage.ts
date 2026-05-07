/**
 * UsageMeteringProvider — Phase 6 (Bucket C.7).
 *
 * In-memory rollups by (kind × tenantId × dimensions). Useful for:
 *   • Test assertions — verify the runtime emitted N plan_invocation events.
 *   • Periodic flush patterns — host runs cron that calls .snapshot() and
 *     POSTs to its billing service, then .reset().
 *
 * Storage shape: a Map keyed by a deterministic event signature. Each entry
 * tracks total quantity + count + last-emit timestamp.
 */

import type { MeteringEvent, MeteringProvider } from './types.js';

export interface UsageRollup {
  kind: string;
  tenantId: string | null;
  userId: string | null;
  tags: Readonly<Record<string, string | number | boolean>>;
  totalQuantity: number;
  count: number;
  firstAt: string;
  lastAt: string;
}

export interface UsageMeteringProviderOptions {
  /** Max distinct rollup buckets retained. Default 10000. FIFO eviction beyond. */
  maxBuckets?: number;
  /** Override time source (tests). */
  now?: () => string;
}

function tagSig(tags: Readonly<Record<string, string | number | boolean>> | undefined): string {
  if (!tags) return '';
  const keys = Object.keys(tags).sort();
  return keys.map((k) => `${k}=${String(tags[k])}`).join(',');
}

function bucketKey(e: MeteringEvent): string {
  return [e.kind, e.tenantId ?? '', e.userId ?? '', tagSig(e.tags)].join('|');
}

export class UsageMeteringProvider implements MeteringProvider {
  readonly name = 'usage';
  private readonly buckets = new Map<string, UsageRollup>();
  private readonly maxBuckets: number;
  private readonly nowFn: () => string;

  constructor(opts: UsageMeteringProviderOptions = {}) {
    this.maxBuckets = opts.maxBuckets ?? 10000;
    this.nowFn = opts.now ?? (() => new Date().toISOString());
  }

  record(event: MeteringEvent): void {
    const key = bucketKey(event);
    const at = event.at ?? this.nowFn();
    const qty = event.quantity ?? 1;
    const existing = this.buckets.get(key);
    if (existing) {
      existing.totalQuantity += qty;
      existing.count += 1;
      existing.lastAt = at;
    } else {
      // FIFO eviction when full — protects long-running runtimes from unbounded
      // memory growth if hosts never call .snapshot() + .reset().
      if (this.buckets.size >= this.maxBuckets) {
        const oldest = this.buckets.keys().next().value;
        if (oldest !== undefined) this.buckets.delete(oldest);
      }
      this.buckets.set(key, {
        kind: event.kind,
        tenantId: event.tenantId ?? null,
        userId: event.userId ?? null,
        tags: event.tags ?? {},
        totalQuantity: qty,
        count: 1,
        firstAt: at,
        lastAt: at,
      });
    }
  }

  /** Snapshot current rollups (immutable copy). */
  snapshot(): ReadonlyArray<UsageRollup> {
    return [...this.buckets.values()].map((r) => ({ ...r, tags: { ...r.tags } }));
  }

  /** Drop all rollups — call after a successful flush to billing. */
  reset(): void {
    this.buckets.clear();
  }

  /** Bucket count (for /health observability). */
  size(): number {
    return this.buckets.size;
  }
}
