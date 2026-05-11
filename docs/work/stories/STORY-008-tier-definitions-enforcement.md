---
id: STORY-008
title: Tier definitions + configurable enforcement
status: done
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-11
---

# STORY-008 — Tier definitions + configurable enforcement

- **Status:** done
- **Completed:** 2026-05-11
- **Created:** 2026-05-06
- **Last updated:** 2026-05-11
- **Commit:** `d041f2e`
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As a host operator, I need to define tiers with request/token limits and enforcement mode (hard / soft+warning / unlimited) so that different customer plans are enforced at runtime.

## Context
Tier definitions are host-configurable (per ADR-019 → ADR-036). Enforcement is read at planner invocation time; over-quota hard-blocks or warns + allows based on tier config.

## What shipped
- `TierProvider` in `packages/runtime` — host passes a `TierConfig` to runtime constructor; built-in `free` tier (5 req/day) used as default.
- Planner invocation guarded by `TierProvider.checkQuota(userId)`; over-quota rejects with `quota-exceeded` status that flows to the shell.
- `QuotaStatus` injected into compose context so the composer can surface the tier state.
- 12 new unit tests + 4 server-integration tests (465 total pass).
- ADR-036 written documenting tier/quota design decisions.

## Done when (original criteria)
- Tier schema defined and stored in PG; REST admin endpoint to create/update tiers. *(PG storage deferred — see STORY-007)*
- ~~Host assigns a user to a tier via API~~ — host passes tier config at runtime init; user-tier assignment via API deferred.
- [x] Planner checks quota before invocation; hard-blocks per tier config.
- [x] Tier enforcement integration-tested (465/465 pass).
