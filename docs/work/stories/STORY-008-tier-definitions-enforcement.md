---
id: STORY-008
title: Tier definitions + configurable enforcement
status: done
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-12
---

# STORY-008 — Tier definitions + configurable enforcement

- **Status:** done
- **Completed:** 2026-05-12
- **Created:** 2026-05-06
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As a host operator, I need to define tiers with request/token limits and enforcement mode (hard / soft+warning / unlimited) so that different customer plans are enforced at runtime.

## Context
Tier definitions are host-configurable (per ADR-019). Enforcement is read at planner invocation time; over-quota hard-blocks or warns + allows based on tier config.

## What was built (PR #33)
- `TierProvider` interface with `check(userId)` / `consume(userId)` / `getTiers()`.
- `InMemoryTierProvider`: host-configurable named tiers with daily request limits (−1 = unlimited), UTC-day reset, graceful tier-not-found (fail-open).
- `NoQuotaProvider`: pass-through for unlimited deployments.
- Enforcement wired in WS user-message path: quota check fires before planner invocation; exceeded → `quota-exceeded` layout composed, planner skipped.

## Done when (original)
- Tier schema defined and stored in PG; REST admin endpoint. ⚠️ Deferred: in-memory only; PG + REST admin are post-MVP.
- Host assigns user to tier via API. ✅ via constructor options.
- Planner checks quota before invocation; hard-blocks per tier config. ✅
- Tier enforcement integration-tested. ✅ (4 server-integration tests)
