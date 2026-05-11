---
id: TASK-006
title: TierProvider + server-side quota enforcement
status: done
story: STORY-008
created: 2026-05-11
last-updated: 2026-05-11
---

# TASK-006 — TierProvider + server-side quota enforcement

- **Status:** done
- **Completed:** 2026-05-11
- **Commit:** `d041f2e`
- **Parent story:** [STORY-008 — Tier definitions + configurable enforcement](../stories/STORY-008-tier-definitions-enforcement.md)

## What was done

- Added `TierProvider` to `packages/runtime/src/providers/tier-provider.ts`.
  - Accepts a `TierConfig` (host-supplied at runtime init) with tier definitions (name, requestLimit, enforcement mode).
  - Built-in `free` tier (5 req/day, hard enforcement) used when no config supplied.
  - In-memory per-user request counter; resets at midnight UTC.
- Wired into `RuntimeServer` and `Runtime`: `checkQuota(userId)` called before planner invocation.
- Over-quota path returns `quota-exceeded` status in the layout envelope; planner is NOT invoked.
- `QuotaStatus` (`{ tier, used, limit, resetAt, state: 'fine'|'warning'|'exceeded' }`) attached to compose context on every turn.
- `/health` exposes current quota summary for dev tooling.
- 12 new unit tests + 4 server-integration tests written (465/465 total pass).
