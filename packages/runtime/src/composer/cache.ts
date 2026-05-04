/**
 * CompositionCache — in-memory LRU keyed by canonical intent fingerprint.
 *
 * Per ADR-012: cached templates are typed-JSON ComposedLayouts keyed by intent.
 * Cache hit = no model call, immediate response. Cache miss = invoke composer,
 * store result, return.
 *
 * Phase 1.3: simple LRU. Phase 1.4 extends with: invalidation on DS-version /
 * theme-token / Feature-Service-doc changes; capacity tier–aware sizing.
 */

import type { ComposedLayout } from '@saasagent/protocol';

export interface CompositionCacheOptions {
  /** Maximum number of entries (LRU). Default 128. */
  maxEntries?: number;
}

export class CompositionCache {
  private readonly maxEntries: number;
  private readonly entries = new Map<string, ComposedLayout>();

  constructor(options: CompositionCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 128;
  }

  get size(): number {
    return this.entries.size;
  }

  /** Look up a cached layout. Re-inserts on hit so LRU recency is fresh. */
  get(key: string): ComposedLayout | undefined {
    const hit = this.entries.get(key);
    if (hit === undefined) return undefined;
    // refresh LRU position
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  /** Insert a layout. Evicts the oldest entry when capacity is exceeded. */
  set(key: string, layout: ComposedLayout): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, layout);
  }

  /** Clear everything. Used on DS-version / theme / feature-doc invalidation. */
  clear(): void {
    this.entries.clear();
  }
}

/** Compute a canonical intent key. Phase 1.3: lowercased trimmed intent. */
export function canonicalIntent(intent: string): string {
  return intent.trim().toLowerCase().replace(/\s+/g, ' ');
}
