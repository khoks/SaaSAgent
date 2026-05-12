# ADR-038: Proactive engine — multi-signal scoring + attention budget

- **Status**: accepted
- **Date**: 2026-05-12
- **Supersedes**: —
- **Superseded by**: —

## Context

[ADR-018](./018-proactive-engine.md) (groomed earlier) established that the
platform supports **unprompted** agent surfacings — the agent decides on
its own when to surface a next-best-action — gated by:

1. **Multi-signal scoring** combining (a) planner confidence, (b) memory
   match, (c) workflow continuity, (d) DOM relevance, and (e) time-since-
   last-touch.
2. **Hard-cap attention budget** per session, so the agent cannot
   over-intrude.

This is one of the load-bearing patentability angles in the product (P-006
candidate, the multi-signal scoring + budget contract is the novel piece).
This ADR fixes the implementation shape for Phase 5.

## Open questions resolved

1. **Where do signals come from?** Server-side derivation from per-WS state:
   - **plannerConfidence**: in Phase 5 a constant 0.5 placeholder; lands fully
     once SonnetPlanner exposes `lastConfidence` (v1).
   - **memoryMatch**: 0 in Phase 5; lands once per-session memory recall is
     wired into the proactive tick (v1).
   - **workflowContinuity**: derived from `Date.now() - lastUserMessageAt`,
     normalized by 30s. Longer gap → "more stuck" → higher signal.
   - **domRelevance**: derived from the per-WS DOM signal ring buffer count.
     `> 0 → 0.6` (the user is interacting with content), `0 → 0`.
   - **timeSinceLastTouch**: `Date.now() - lastBroadcastAt`, normalized by 60s.
   These are tunable; the proper ML model in v1 replaces them with learned
   signals.

2. **What's the scoring function?** Linear weighted sum capped at 1.0. Default
   weights bias toward planner-confidence (0.35) and deemphasize raw
   time-since (0.10). Same explainability pattern as the weighted-feature
   churn calculator (ADR-031 / P-005) — per-signal contribution =
   weight × value, surfaced in `ProactiveScore.factors` for the dashboard.
   Hosts that want ML scoring (LightGBM etc.) implement `ProactiveScorer`
   and swap in via configuration.

3. **What's the trigger model?** Per-WS idle-tick loop (`setInterval` at
   `proactiveTickMs`, default 5000ms). Each tick:
   - Builds a `ProactiveContext` from per-WS state.
   - Calls `engine.evaluate(ctx)` which combines scorer + budget.
   - On fire, composes a `'proactive-nudge'` (or host-overridden intent)
     layout and broadcasts via the same SSE channel as reactive layouts.
   - Stops on `ws.close`.

4. **What about a cooldown after user activity?** Hard-coded 8000ms cooldown
   after the most recent user-message — re-uses the Phase 2.5.x re-ask
   window. A proactive that fires within the cooldown would compete with
   the planner's reactive response, which is bad UX.

5. **How does budget interact with scoring?** Budget is consumed ONLY when
   the engine intends to fire (score ≥ threshold AND `budget.tryConsume`
   returns true). Below-threshold ticks don't burn budget. Atomic
   try-consume in the budget implementation so concurrent ticks can't
   double-spend.

6. **Default threshold + budget?** Threshold 0.6 (must clear over half the
   max weighted score). Budget 3 per session. Both host-tunable.

7. **How does the shell distinguish proactive from reactive?**
   `ComposedLayoutMetadata.intent` carries the proactive intent label
   (default `'proactive-nudge'`, overridable per-deployment, e.g.
   `'expedia:bundle-savings-nudge'`). The shell can branch rendering on this
   (e.g. dismissable banner instead of full takeover). Default renderer
   treats it as a normal layout — host customization is opt-in.

## Decision

Adopt the `ProactiveEngine` abstraction with one first-party implementation
(`DefaultProactiveEngine`) composing one first-party scorer
(`DefaultProactiveScorer`) and one first-party budget
(`InMemoryAttentionBudget`). Runtime server runs a per-WS idle-tick loop
that calls `engine.evaluate(ctx)` and broadcasts on fire.

### Interfaces

```ts
interface ProactiveScorer {
  readonly name: string;
  score(ctx: ProactiveContext): ProactiveScore;
}

interface AttentionBudget {
  readonly perSessionMax: number;
  tryConsume(sessionId: string): boolean;
  remaining(sessionId: string): number;
  reset?(sessionId?: string): void;
}

interface ProactiveEngine {
  readonly name: string;
  readonly threshold: number;
  readonly scorer: ProactiveScorer;
  readonly budget: AttentionBudget;
  evaluate(ctx: ProactiveContext): ProactiveDecision;
}

type ProactiveDecision =
  | { fire: true; score: ProactiveScore; suggestedIntent: string }
  | { fire: false; score: ProactiveScore; reason: 'below-threshold' | 'budget-exhausted' };
```

### Runtime wiring

- `RuntimeServerOptions.proactiveEngine?: ProactiveEngine` — optional.
- `RuntimeServerOptions.proactiveTickMs?: number` — default 5000.
- Per-WS state tracks `lastUserMessageAt` to enforce the 8000ms cooldown.
- Tick fires via `setInterval` started in WS `open` handler; cleared on
  WS `close`.

### `/health` surfacing

`/health` includes:
- `proactiveEngine`: name (or `'off'` when undefined)
- `proactiveThreshold`, `proactiveBudgetPerSession`, `proactiveTickMs`
  (when engine is configured)

So devs can inspect the proactive configuration without driving traffic.

## Consequences

### Positive

- **Closes the Phase 5 INIT-003 gate**: day-2 proactive re-engagement
  demonstrable end-to-end (idle → tick → score → fire → SSE broadcast).
- **Patent-novelty surface**: the multi-signal scoring + budget contract is
  a P-006 candidate (companion to P-005 explainable churn). The
  per-signal `factors` array is the same explainability mechanism.
- **Pluggable**: hosts that want ML-driven scoring or distributed budgets
  swap in implementations behind the same interface.
- **No surprise intrusions**: budget hard-cap + cooldown prevent the agent
  from spamming the user. Default 3/session is conservative.

### Negative

- **Stub signals in Phase 5**: plannerConfidence is constant 0.5,
  memoryMatch is 0. Real signal extraction requires Planner/Memory
  introspection, lands in v1. Until then, the engine fires more often on
  domRelevance + workflowContinuity than the design intends.
- **In-memory budget**: a runtime restart resets per-session budgets.
  Acceptable for Phase 5; Redis-backed variant lands in v1 for
  horizontally-scaled deployments.
- **Idle-tick interval is a tunable**: too frequent burns model spend on
  composer calls; too sparse misses the timing window. Default 5000ms
  with 8000ms cooldown is a reasonable starting point but needs
  user-test calibration.

### Neutral

- The engine's `suggestedIntent` is configurable per-deployment. Expedia
  configures `'expedia:bundle-savings-nudge'`; a fitness app might use
  `'fitness:break-reminder'`. The composer picks the template via the
  cached-templates path (ADR-012).

## Implementation references

- Provider: [packages/runtime/src/proactive/](../../../packages/runtime/src/proactive/)
- Server integration:
  [packages/runtime/src/transport/server.ts](../../../packages/runtime/src/transport/server.ts)
  (search for "Phase 5" markers — engine field, idle-tick loop, runProactiveTick)

## References

- [ADR-018](./018-proactive-engine.md) — original grooming decision; this
  ADR is its implementation fixation.
- [ADR-031](./031-customer-churn-ml-model.md) — sister ML model with the
  same per-signal explainability pattern (P-005).
- [ADR-019](./019-end-user-tier-quota-system.md) — independent concept;
  attention budget is per-session UX hygiene, not per-user pricing.
