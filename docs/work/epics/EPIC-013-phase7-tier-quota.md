---
id: EPIC-013
title: Phase 7 — Tier/quota enforcement
status: in-review
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-11
---

# EPIC-013 — Phase 7: Tier/quota enforcement

- **Status:** in-review
- **Created:** 2026-05-06
- **Last updated:** 2026-05-11
- **PR:** khoks/SaaSAgent#33
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

## Child stories

| ID | Title | Status |
|---|---|---|
| [STORY-030](../stories/STORY-030-tier-quota-enforcement-banner.md) | TierProvider quota enforcement + QuotaBanner UI | in-review |
