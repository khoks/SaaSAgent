---
id: STORY-007
title: Per-user request/token tracking
status: in-progress
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-12
---

# STORY-007 — Per-user request/token tracking

- **Status:** in-progress
- **Created:** 2026-05-06
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As a host operator, I need per-user request and token counts written to PG and ClickHouse so that tier limits can be enforced and usage can be reported.

## Context
Metering foundation (C.7) shipped in EPIC-012 provides the tracking primitives. This story wires them to durable storage (PG for real-time enforcement, ClickHouse for analytics).

## Progress (2026-05-12)
`InMemoryTierProvider.consume()` increments a per-user in-memory counter on each planner invocation — request tracking is functionally complete for the MVP gate. Remaining:
- Durable PG storage for request counts — deferred post-MVP.
- Token counting via LLM response metadata — deferred post-MVP.
- REST endpoint for current usage — deferred post-MVP.

## Done when (original)
- Per-user request count incremented on each planner invocation; stored in PG. ⚠️ in-memory only.
- Per-user token count tallied via LLM response metadata; stored in PG + ClickHouse. ❌ deferred.
- REST endpoint exposes current usage for the authenticated user. ❌ deferred.
