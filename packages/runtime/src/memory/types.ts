/**
 * MemoryProvider — Phase 2.1a stub seam, real impl in Phase 2.3.
 *
 * The planner needs prior conversation state to disambiguate things like
 * "show me more" or "the second one" — that's continuity. Phase 2.3 wires this
 * to Postgres (raw turn log) + Qdrant (semantic recall) + ClickHouse (analytics)
 * per ADR-008 / ADR-032. Phase 2.1 ships with NullMemoryProvider so the planner's
 * call site is stable and 2.3 doesn't have to refactor the planner's hot path.
 *
 * Interface intentionally minimal: `recall(query)` returns memory snippets the
 * planner can fold into ConversationContext.memoryRecall before invoking the
 * composer. `record(turn)` persists a turn for future recalls.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

export interface MemoryProvider {
  /** Provider name for logging / observability. */
  readonly name: string;
  /**
   * Surface relevant prior turns + facts for the current intent.
   * Stub returns []. Real impl does Qdrant top-k + Postgres recent-N.
   */
  recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>>;
  /**
   * Persist a turn (user → agent) for future recall. Stub no-op; real impl
   * writes to Postgres synchronously and Qdrant async (per ADR-032's hybrid
   * latency budget).
   */
  record(turn: ConversationTurn): Promise<void>;
}

export interface MemoryQuery {
  /** Free-text query the planner is solving (typically the user's latest message). */
  text: string;
  /** Logical session id — bounds memory recall to this conversation. */
  sessionId?: string;
  /** Optional user id for cross-session recall. */
  userId?: string;
  /** Max items to return. Stub ignores this. */
  limit?: number;
}
