/**
 * ChainedMemoryProvider — Phase 2.3.x.
 *
 * Composes multiple MemoryProviders into one. Common pattern:
 *
 *   recall:  query each in order; return concatenated results (deduped to limit)
 *   record:  fan-out to every provider in parallel; resolve when all settle
 *
 * Use cases:
 *   • In-memory fast path + durable file fallback (latency vs persistence)
 *   • KeyValue (recent-N) + Qdrant (semantic top-k) + Postgres (audit log)
 *   • Per-tenant isolation (route by sessionId prefix to different providers)
 *
 * Errors from one provider don't poison the chain — record() awaits all and
 * collects errors; recall() falls through. The chain reports the first
 * provider's `name` plus a `chained:`-prefixed display name in /health.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

import type { MemoryProvider, MemoryQuery } from './types.js';

export class ChainedMemoryProvider implements MemoryProvider {
  readonly name: string;

  constructor(private readonly providers: ReadonlyArray<MemoryProvider>) {
    if (providers.length === 0) {
      throw new Error('ChainedMemoryProvider requires at least one provider');
    }
    this.name = `chained:${providers.map((p) => p.name).join('+')}`;
  }

  async recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    const limit = query.limit ?? 10;
    const out: MemoryRecall[] = [];
    const seen = new Set<string>();
    for (const p of this.providers) {
      let res: ReadonlyArray<MemoryRecall>;
      try {
        res = await p.recall(query);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[chained-memory] recall on ${p.name} failed: ${(err as Error).message}`);
        continue;
      }
      for (const r of res) {
        // De-dupe by store+summary so the same turn surfaced by two providers
        // doesn't double-count.
        const key = `${r.store}::${r.summary}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  async record(turn: ConversationTurn, sessionId?: string): Promise<void> {
    const results = await Promise.allSettled(
      this.providers.map((p) => p.record(turn, sessionId)),
    );
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? this.providers[i]!.name : null))
      .filter((x): x is string => x !== null);
    if (failed.length > 0 && failed.length === this.providers.length) {
      // All providers failed — surface the error so the caller knows.
      throw new Error(`[chained-memory] all providers failed to record: ${failed.join(', ')}`);
    }
    if (failed.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[chained-memory] record partial failure: ${failed.join(', ')} failed; ${this.providers.length - failed.length} succeeded`,
      );
    }
  }
}
