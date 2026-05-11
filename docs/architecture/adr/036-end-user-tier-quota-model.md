# ADR-036: End-user tier/quota model

- **Status**: accepted
- **Date**: 2026-05-11
- **Supersedes**: —
- **Superseded by**: —

## Context

[ADR-019](./019-end-user-tier-quota-system.md) (groomed earlier) established
that the platform supports an end-user tier/quota concept *inside* a host
enterprise's deployment — distinct from the open-core pricing model in
[ADR-020](./020-open-core-pricing.md) (which meters the host's own usage to
the platform vendor). End users of the host get tiered access to the agent
("free" with N requests/day, "pro" with M, etc.) and the platform surfaces a
visible "X requests remaining" affordance so users see what they have.

This ADR fixes the implementation shape that lands in Phase 7.

## Open questions resolved

1. **What identifies "a user" for quota?** Without full AuthProvider principal
   threading at the WS boundary (deferred), the MVP grain is **sessionId** —
   one quota bucket per WS connection. Hosts that need cross-session
   identity (e.g. a logged-in user across browser tabs) override
   `TierProvider` with one that maps sessionId → userId via their own session
   store. This keeps the MVP integration trivial without foreclosing the
   real-identity path.
2. **What dimension is limited?** Per-user **request count per UTC day** for
   the MVP — measured as one user-message envelope that triggers the planner.
   Action emits (button clicks within a turn), DOM observation, and
   observability emits do NOT count. This matches user mental model (≈ "how
   many things did I ask the agent today") and avoids penalizing rich UIs
   that emit many follow-on signals.
3. **What about model-token or compute cost?** Deferred to v1. The
   `MeteringProvider` already records token usage; a future
   `TokenBudgetTierProvider` can compose with it. MVP stays simple.
4. **What happens at the limit?** The runtime composes a special
   `intent='quota-exceeded'` layout (NOT the planner output) and attaches a
   `QuotaStatus` to its metadata. The shell's `QuotaBanner` renders the
   exceeded state in red with the reset time. The planner is not invoked,
   saving model spend on rejected turns.
5. **Fail-open or fail-closed under provider error?** Fail-open. If the
   TierProvider throws, the runtime proceeds with the request and stamps the
   layout's quotaStatus with `reason: 'provider-error'`. Rationale: a flaky
   billing dependency must not break the agent UX. Hosts that need
   fail-closed wrap their TierProvider to throw differently.

## Decision

Adopt the **TierProvider** abstraction with three first-party implementations
and a per-layout `QuotaStatus` attachment to surface state to the shell.

### TierProvider interface

```ts
interface TierProvider {
  readonly name: string;
  resolveTier(userId: string): string | Promise<string>;
  check(userId: string): QuotaCheckResult | Promise<QuotaCheckResult>;
  consume(userId: string): QuotaCheckResult | Promise<QuotaCheckResult>;
  listTiers?(): readonly TierDefinition[];
  reset?(userId: string): void | Promise<void>;
}
```

### Implementations

- **`NoQuotaProvider`** (default) — every check returns `allowed: true`,
  `limit: Infinity`. The runtime attaches no `quotaStatus` to layouts, so the
  shell's `QuotaBanner` stays hidden — no quota chrome in open-source mode.
- **`InMemoryTierProvider`** — host-configured tier definitions
  (`{ id, label, dailyRequests }`) + per-user counters in a `Map`. UTC-day
  reset boundary. Suitable for single-process deployments and tests.
- **`(future) RedisTierProvider`** — same interface, Redis-backed counter
  for horizontally-scaled deployments. Deferred to v1.

### Wire contract

`QuotaStatus` (in `@saasagent/protocol`) is attached to every composed
layout's `metadata.quotaStatus` when a non-Noop provider is configured.
The shell's `QuotaBanner` reads it on each `onLayout` and renders three
visual states: fine / warning (≤ 20% remaining) / exceeded. `Infinity` values
are normalized to `null` for JSON safety.

### Runtime integration

- On WS arrival of `type='user-message'` envelope: `quotaProvider.consume(sessionId)`.
- If denied: compose a `quota-exceeded` layout with the QuotaStatus attached,
  broadcast, return without invoking the planner.
- If allowed: stash the result on per-WS state, proceed to planner + composer,
  attach the stashed status to the resulting layout's metadata before
  broadcast.

### /health surfacing

The runtime's `/health` endpoint includes `quotaProvider` (name) and
`quotaTiers` (the configured tier definitions, if any). Enterprise devs
evaluating an integration can verify their tier config without driving a
real session through the UI.

## Consequences

### Positive

- Closes a real MVP acceptance criterion: "visible 'X remaining' element
  renders, host-configured tier limits enforced".
- Commercial leverage: enables the open-core pricing model in ADR-020 by
  giving hosts a free, working enforcement primitive they can extend.
- Save model spend on rejected turns — quota check runs before the planner.
- The `metadata.quotaStatus` mechanism is reusable: future "session warning"
  or "feature-flag" payloads can ride the same channel without protocol churn.

### Negative

- SessionId-as-userId is a short-term shortcut. Hosts using the
  `InMemoryTierProvider` directly will see quota reset on each new browser
  tab. The path forward (custom TierProvider that maps via the host session
  store) is documented but adds onboarding work.
- In-memory counters do not survive a runtime restart. Acceptable for MVP
  (counters reset → users get more quota → no harm done). RedisTierProvider
  fixes this at v1.

### Neutral

- The `quota-exceeded` intent rides through the composer just like any other
  intent. If the composer has no registered template, it falls back to the
  generic status message via the StubComposer/HaikuComposer narrative path.
  Hosts can register a richer template if they want a custom UI.

## Implementation references

- Provider: [packages/runtime/src/quota/](../../../packages/runtime/src/quota/)
- Server integration:
  [packages/runtime/src/transport/server.ts](../../../packages/runtime/src/transport/server.ts)
  (search for "Phase 7" markers)
- Protocol type: `QuotaStatus` in
  [packages/protocol/src/layout.ts](../../../packages/protocol/src/layout.ts)
- Shell widget:
  [packages/web-shell/src/quota-banner.ts](../../../packages/web-shell/src/quota-banner.ts)

## References

- [ADR-019](./019-end-user-tier-quota-system.md) — original tier/quota
  grooming decision; this ADR is its implementation fixation.
- [ADR-020](./020-open-core-pricing.md) — sister concept (host→vendor billing).
- [ADR-038](./038-sse-websocket-transport.md) — the wire path
  `QuotaStatus` rides on.
