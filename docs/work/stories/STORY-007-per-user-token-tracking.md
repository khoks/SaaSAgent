---
id: STORY-007
title: Per-user request/token tracking
status: backlog
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-06
---

# STORY-007 — Per-user request/token tracking

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As a host operator, I need per-user request and token counts written to PG and ClickHouse so that tier limits can be enforced and usage can be reported.

## Context
Metering foundation (C.7) shipped in EPIC-012 provides the tracking primitives. This story wires them to durable storage (PG for real-time enforcement, ClickHouse for analytics).

## Done when
- Per-user request count incremented on each planner invocation; stored in PG.
- Per-user token count tallied via LLM response metadata; stored in PG + ClickHouse.
- REST endpoint exposes current usage for the authenticated user.
