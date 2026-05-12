---
id: EPIC-013
title: Phase 7 — Tier/quota enforcement
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-12
---

# EPIC-013 — Phase 7: Tier/quota enforcement

- **Status:** done (2026-05-12)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-12
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

End-user crosses 80% request threshold → composed visibility element renders. Host-configured tiers enforced. Phase 7 gate satisfied 2026-05-12.

## What was built (PR #33, merged 2026-05-12)

| Layer | Deliverable | Tests |
|---|---|---|
| `packages/runtime/src/quota/` | `TierProvider` interface + `NoQuotaProvider` + `InMemoryTierProvider` with UTC-day reset, unlimited tier (-1 sentinel), tier-not-found fail-open | 12 unit |
| `packages/protocol/src/layout.ts` | `QuotaStatus` type + `ComposedLayoutMetadata.quotaStatus` field, Infinity→null normalization | — |
| `packages/runtime/src/transport/server.ts` | Quota check on user-message arrival; denied → compose `quota-exceeded` layout + skip planner; allowed → attach `quotaStatus` to layout; `/health` exposes tier snapshot; fail-open on provider error | 4 server-integration |
| `packages/web-shell/src/quota-banner.ts` | Three-state `QuotaBanner` widget (gray fine / amber warning / red exceeded), hidden when no `TierProvider` configured | 8 widget |

**ADR:** ADR-036. **Test count after:** 465/465 green. **Demo:** `apps/demo-expedia` wired with `InMemoryTierProvider(free: 5 req/day)`, all 3 banner states verified live in Chrome.

## Note
`TierProvider` uses in-memory storage. PG/ClickHouse persistence and REST admin tier-management endpoints are deferred post-MVP.

## Phase 7 gate
End-user crosses 80% threshold → "X remaining" composed element renders. Host-configured tier limits enforced. ✅ **Satisfied 2026-05-12** — all three banner states verified live against Expedia demo.

## Child stories
- [STORY-007 — Per-user request/token tracking](../stories/STORY-007-per-user-token-tracking.md) — in-progress (request tracking done in-memory; PG + token tracking deferred)
- [STORY-008 — Tier definitions + configurable enforcement](../stories/STORY-008-tier-definitions-enforcement.md) — done
- [STORY-009 — Visible X-remaining composed UI element](../stories/STORY-009-xremaining-ui-element.md) — done
