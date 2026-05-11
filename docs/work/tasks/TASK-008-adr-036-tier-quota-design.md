---
id: TASK-008
title: ADR-036 tier/quota architecture decision
status: done
story: STORY-008
created: 2026-05-11
last-updated: 2026-05-11
---

# TASK-008 — ADR-036 tier/quota architecture decision

- **Status:** done
- **Completed:** 2026-05-11
- **Commit:** `d041f2e`
- **Parent story:** [STORY-008 — Tier definitions + configurable enforcement](../stories/STORY-008-tier-definitions-enforcement.md)

## What was done

- Wrote `docs/adr/ADR-036-tier-quota.md` documenting:
  - Host-configurable `TierConfig` passed at `new Runtime({ tier })` construction time.
  - In-memory counter as Phase 7 MVP; PG-backed persistence as Phase 7.5 follow-on.
  - `QuotaStatus` shape and how it flows from `TierProvider` → compose context → shell.
  - Enforcement modes: `hard` (block at limit), `soft` (warn at 80%, allow through), `unlimited`.
  - Reset cadence: per-day (midnight UTC) for MVP; per-billing-period deferred.
