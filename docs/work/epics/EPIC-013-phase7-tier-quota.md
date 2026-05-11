---
id: EPIC-013
title: Phase 7 — Tier/quota enforcement
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-11
---

# EPIC-013 — Phase 7: Tier/quota enforcement

- **Status:** done
- **Completed:** 2026-05-11
- **Created:** 2026-05-06
- **Last updated:** 2026-05-11
- **Commit:** `d041f2e` (feat(phase-7): end-user tier/quota — TierProvider, QuotaBanner, ADR-036)
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

End-user crosses 80% request threshold → composed visibility element renders. Host-configured tiers enforced.

## Scope (per INIT-003 Phase 7)
- Per-user request/token tracking (PG + ClickHouse)
- Tier definitions (host-configurable)
- Configurable enforcement (hard / soft + warning / unlimited per tier)
- Visible "X requests remaining" composed UI element

## Note
Metering foundation (C.7) shipped in EPIC-012. This epic wires it to UI and enforcement.

## Phase 7 gate
End-user crosses 80% threshold → "X remaining" composed element renders. Host-configured tier limits enforced.

## Phase 7 gate result
All three visual states verified live in Chrome against `apps/demo-expedia`: fine (gray) → warning (amber, ≤20% remaining) → exceeded (red, planner blocked). 465/465 tests pass.

## Child stories
- [STORY-007 — Per-user request/token tracking](../stories/STORY-007-per-user-token-tracking.md) — in-progress (in-memory tracking shipped; PG/ClickHouse deferred)
- [STORY-008 — Tier definitions + configurable enforcement](../stories/STORY-008-tier-definitions-enforcement.md) — done
- [STORY-009 — Visible X-remaining composed UI element](../stories/STORY-009-xremaining-ui-element.md) — done
