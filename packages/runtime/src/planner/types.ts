/**
 * Planner types — Phase 2.1.
 *
 * The planner sits between the WebSocket boundary (where InstructionEnvelopes
 * arrive) and the Composer (which renders a layout). Its job:
 *
 *   1. Extract the actual user intent from the envelope (e.g. payload.text for
 *      a user-message envelope, vs envelope.type for an action envelope).
 *   2. Decide whether to invoke any registered Skills or Tools to gather data.
 *   3. Return a canonical intent string + the invocation results for the
 *      Composer to render.
 *
 * Phase 2.1a: StubPlanner — deterministic routing only, no LLM, no tools.
 *   Closes the "envelope.type used as intent literally" gap from Phase 1.x.
 *
 * Phase 2.1b: SonnetPlanner — claude-sonnet-4-6 with native tool_use API,
 *   multi-round tool-use loop, MemoryProvider-backed recall.
 *
 * Phase 2.1c: ComposeContext.toolResults so the composer sees what the planner
 *   gathered when rendering.
 */

import type { ConversationContext, InstructionEnvelope } from '@saasagent/protocol';

import type { ExecutionResult } from '../executor/index.js';

export interface PlanRequest {
  /** The envelope from the WebSocket — type, payload, source, composeCycleId. */
  envelope: InstructionEnvelope;
  /**
   * Conversation context the runtime built before calling plan(). The planner
   * may consult `recentTurns` / `memoryRecall` to disambiguate the envelope.
   */
  context: ConversationContext;
}

export interface ToolInvocation {
  /** Skill or Tool name. */
  name: string;
  /** Which executor was called. */
  kind: 'skill' | 'tool';
  /** Input args passed to the executor. */
  input: unknown;
  /** Result from the executor (may be ok or error). */
  result: ExecutionResult;
}

export interface PlanResult {
  /**
   * Canonical intent string the composer will compose against. For a user-message
   * envelope this is the user's text; for an action envelope it's typically the
   * envelope.type (e.g. "find-similar-tv") possibly enriched with planner context.
   */
  intent: string;
  /**
   * Skill / Tool invocations the planner performed during planning, in order.
   * Empty for a passthrough plan; non-empty when the planner gathered data.
   */
  invocations: ReadonlyArray<ToolInvocation>;
  /**
   * Optional natural-language narration the planner produced (e.g. "I found
   * 3 matching products..."). The composer may surface this; or a future
   * narration channel may stream it independently.
   */
  narration?: string;
}

export interface Planner {
  /** Provider name for logging / observability. */
  readonly name: string;
  plan(request: PlanRequest): Promise<PlanResult>;
}
