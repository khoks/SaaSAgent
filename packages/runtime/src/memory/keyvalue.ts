/**
 * KeyValueMemoryProvider — Phase 2.3 real default.
 *
 * In-process Map<sessionId, ConversationTurn[]>. Each session retains its
 * most recent N turns (default 100); recall returns the tail of that list
 * formatted as MemoryRecall summaries the planner can fold into its user
 * message via SonnetPlanner.buildPlannerUserMessage().
 *
 * Recall is recency-only — no semantic ranking. That's a Qdrant concern
 * deferred to Phase 2.3.x. Pragmatically, recent-N gets you 80% of the way:
 * "show me more" / "the second one" / "and add to cart" all work because
 * the immediately-prior turn is in the recall set.
 *
 * Persistence: none. A runtime restart loses all memory. For durable storage
 * substitute PostgresMemoryProvider once Phase 2.3.x lands.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

import type { MemoryProvider, MemoryQuery } from './types.js';

export interface KeyValueMemoryProviderOptions {
  /**
   * Max turns retained per session. Older turns are evicted FIFO. Default 100
   * (≈50 user/agent exchanges) — enough for a long working session, bounded
   * to keep planner prompt sizes predictable.
   */
  maxPerSession?: number;
  /** Default recall limit when MemoryQuery.limit isn't set. Default 10. */
  defaultRecallLimit?: number;
}

const DEFAULT_SESSION = '__default__';

export class KeyValueMemoryProvider implements MemoryProvider {
  readonly name = 'keyvalue';
  private readonly sessions = new Map<string, ConversationTurn[]>();
  private readonly maxPerSession: number;
  private readonly defaultRecallLimit: number;

  constructor(options: KeyValueMemoryProviderOptions = {}) {
    this.maxPerSession = options.maxPerSession ?? 100;
    this.defaultRecallLimit = options.defaultRecallLimit ?? 10;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    const session = query.sessionId ?? DEFAULT_SESSION;
    const turns = this.sessions.get(session);
    if (!turns || turns.length === 0) return [];
    const limit = query.limit ?? this.defaultRecallLimit;
    const tail = turns.slice(-limit);
    return tail.map((turn) => ({
      store: 'in-memory' as const,
      summary: `${turn.speaker} (${turn.at}): ${truncate(turn.text, 200)}`,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async record(turn: ConversationTurn, sessionId?: string): Promise<void> {
    const key = sessionId ?? DEFAULT_SESSION;
    const list = this.sessions.get(key) ?? [];
    list.push(turn);
    if (list.length > this.maxPerSession) {
      list.splice(0, list.length - this.maxPerSession);
    }
    this.sessions.set(key, list);
  }

  /** Inspection helper — returns a defensive copy of all turns for a session. */
  getSession(sessionId: string): ReadonlyArray<ConversationTurn> {
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  /** All session ids currently held (used by REST /memory/sessions). */
  listSessions(): ReadonlyArray<string> {
    return [...this.sessions.keys()];
  }

  /** Drop one session's memory. Returns true if the session existed. */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /** Wipe all sessions. */
  clearAll(): void {
    this.sessions.clear();
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
