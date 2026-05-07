---
id: EPIC-013
title: Phase 7 — Tier/quota enforcement
status: backlog
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-06
---

# EPIC-013 — Phase 7: Tier/quota enforcement

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
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
- [STORY-007 — Per-user request/token tracking](../stories/STORY-007-per-user-token-tracking.md)
- [STORY-008 — Tier definitions + configurable enforcement](../stories/STORY-008-tier-definitions-enforcement.md)
- [STORY-009 — Visible X-remaining composed UI element](../stories/STORY-009-xremaining-ui-element.md)
