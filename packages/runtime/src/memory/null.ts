/**
 * NullMemoryProvider — Phase 2.1a placeholder, kept available for tests
 * that explicitly want zero memory behavior.
 *
 * Returns no recall and silently drops record() calls. Production uses
 * KeyValueMemoryProvider as the default in 2.3; this lives on for test
 * scenarios that want to assert "nothing should be in memory".
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';
import type { MemoryProvider, MemoryQuery } from './types.js';

export class NullMemoryProvider implements MemoryProvider {
  readonly name = 'null';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recall(_query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    return [];
  }

  async record(
    _turn: ConversationTurn,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _sessionId?: string,
  ): Promise<void> {
    // no-op
  }
}
