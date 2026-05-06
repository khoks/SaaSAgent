/**
 * StubPlanner — Phase 2.1a.
 *
 * Deterministic routing only — no LLM call, no skill/tool invocation. The
 * planner's narrow job here is to fix the architectural gap that landed in
 * Phase 1.x: the runtime was passing `envelope.type` literally as the intent
 * string to the composer, which meant `user-message` envelopes produced
 * intent="user-message" instead of the actual user text.
 *
 * Routing rules:
 *   • envelope.type === 'user-message' → intent = payload.text (trimmed). If
 *     payload.text is missing or empty, intent falls back to "empty-user-message"
 *     so the composer can render a "say something" prompt.
 *   • All other envelopes (action emits like 'find-similar-tv', 'add-to-cart'):
 *     intent = envelope.type (preserves existing Phase 1.x behavior).
 *
 * Phase 2.1b's SonnetPlanner takes over with real reasoning + tool use.
 */

import type { Planner, PlanRequest, PlanResult } from './types.js';

export class StubPlanner implements Planner {
  readonly name = 'stub';

  // eslint-disable-next-line @typescript-eslint/require-await
  async plan(req: PlanRequest): Promise<PlanResult> {
    const env = req.envelope;
    if (env.type === 'user-message') {
      const text = extractText(env.payload);
      if (text.length > 0) {
        return { intent: text, invocations: [] };
      }
      return { intent: 'empty-user-message', invocations: [] };
    }
    // Action envelopes (button click → emit) — preserve the type as intent.
    return { intent: env.type, invocations: [] };
  }
}

function extractText(payload: unknown): string {
  if (payload == null || typeof payload !== 'object') return '';
  const t = (payload as { text?: unknown }).text;
  return typeof t === 'string' ? t.trim() : '';
}
