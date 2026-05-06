/**
 * NullMemoryProvider — Phase 2.1a placeholder.
 *
 * Returns no recall and silently drops record() calls. Lets the planner ship
 * without any storage dependency; Phase 2.3 swaps in a real Postgres+Qdrant
 * implementation behind the same interface.
 *
 * Purpose: keep the planner call site `await memory.recall(...)` stable so
 * Phase 2.3 is a constructor swap, not a planner refactor.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';
import type { MemoryProvider, MemoryQuery } from './types.js';

export class NullMemoryProvider implements MemoryProvider {
  readonly name = 'null';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recall(_query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async record(_turn: ConversationTurn): Promise<void> {
    // no-op
  }
}
