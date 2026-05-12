# STORY-030 — TierProvider quota enforcement + QuotaBanner UI

- **Status:** in-review
- **Epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **PR:** khoks/SaaSAgent#33

## User story
As a SaaS enterprise host, I can configure per-user daily request tiers (e.g. free=5, pro=50, concierge=unlimited) so that when an end-user crosses 80% of their quota the shell renders a visible "X remaining" banner — and on exhaustion the planner is skipped, saving model spend.

## What was built (PR #33)

| Layer | What |
|---|---|
| **Protocol** | New `QuotaStatus` type + `ComposedLayoutMetadata.quotaStatus` field. `Infinity` normalized to `null` for JSON safety. |
| **TierProvider** | `TierProvider` abstraction. `NoQuotaProvider` (default, unlimited) + `InMemoryTierProvider` (configurable tiers, UTC-day reset, `dailyRequests: -1` for unlimited). 12 unit tests. |
| **Runtime server** | On `user-message`: `quotaProvider.consume(sessionId)`. Denied → compose `quota-exceeded` layout, broadcast, **skip planner**. Allowed → attach `QuotaStatus` to layout metadata. Fails **open** on provider error. `/health` surfaces `quotaProvider` name + tier defs. 4 server-integration tests via real WS+SSE. |
| **Web shell** | `QuotaBanner` plain-DOM widget — three visual states (fine / warning / exceeded). Hidden when no provider configured. Wired into `SaaSAgentShell` to read `layout.metadata.quotaStatus` on each `onLayout`. 8 widget tests. |
| **ADR** | ADR-036 — End-user tier/quota model + TierProvider abstraction. Resolves: user identity grain (sessionId for MVP), limit dimension (daily request count), exhaustion behavior (composed exceeded layout, planner skipped), error policy (fail-open). |
| **Demo** | `apps/demo-expedia/server/start-runtime.mjs` wired with `free` (5/day) + `pro` (50/day) + `concierge` (unlimited) tiers for E2E validation. |

## Acceptance criteria
- [x] End-user crossing 80% quota threshold sees "X remaining" warning banner
- [x] Exhausted user sees exceeded banner; planner is skipped (no model spend)
- [x] Host configures tiers via `InMemoryTierProvider` without touching runtime internals
- [x] `NoQuotaProvider` default means unlimited users see no banner
- [x] Provider errors fail open — UX unaffected if billing dep is flaky
- [x] Phase 7 INIT-003 gate: "X remaining" composed element renders; host-configured tier limits enforced ✅
