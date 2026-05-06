/**
 * MemoryProvider — Phase 2.1a stub seam, Phase 2.3 real impl.
 *
 * The planner needs prior conversation state to disambiguate things like
 * "show me more" or "the second one" — that's continuity. Phase 2.3 ships
 * KeyValueMemoryProvider as the default (in-process Map keyed by sessionId);
 * future phases swap in a real Postgres+Qdrant+ClickHouse impl per ADR-008/032
 * behind the same interface.
 *
 * Per-session scoping: both `recall(query.sessionId)` and `record(turn, sessionId)`
 * accept a session id so multiple concurrent users on the same runtime don't
 * cross-contaminate memory. RuntimeServer assigns a sessionId per WebSocket
 * connection in Phase 2.3.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

export interface MemoryProvider {
  /** Provider name for logging / observability. */
  readonly name: string;
  /**
   * Surface relevant prior turns + facts for the current intent, scoped to
   * `query.sessionId` if provided. Stub returns []. Real impls do recent-N
   * + (eventually) Qdrant top-k.
   */
  recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>>;
  /**
   * Persist a turn (user → agent) for future recall, scoped to the optional
   * sessionId. Phase 2.1a stub no-ops; KeyValueMemoryProvider stores to an
   * in-process Map; future Postgres impl writes durably.
   */
  record(turn: ConversationTurn, sessionId?: string): Promise<void>;
}

export interface MemoryQuery {
  /** Free-text query the planner is solving (typically the user's latest message). */
  text: string;
  /** Logical session id — bounds memory recall to this conversation. */
  sessionId?: string;
  /** Optional user id for cross-session recall. */
  userId?: string;
  /** Max items to return. Default 10 in KeyValueMemoryProvider. */
  limit?: number;
}
