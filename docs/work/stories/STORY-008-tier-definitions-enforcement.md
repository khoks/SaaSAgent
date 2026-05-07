---
id: STORY-008
title: Tier definitions + configurable enforcement
status: backlog
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-06
---

# STORY-008 — Tier definitions + configurable enforcement

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As a host operator, I need to define tiers with request/token limits and enforcement mode (hard / soft+warning / unlimited) so that different customer plans are enforced at runtime.

## Context
Tier definitions are host-configurable (per ADR-019). Enforcement is read at planner invocation time; over-quota hard-blocks or warns + allows based on tier config.

## Done when
- Tier schema defined and stored in PG; REST admin endpoint to create/update tiers.
- Host assigns a user to a tier via API.
- Planner checks quota before invocation; hard-blocks or issues soft warning per tier config.
- Tier enforcement integration-tested.
