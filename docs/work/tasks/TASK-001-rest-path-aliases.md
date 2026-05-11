# TASK-001 — REST path aliases for executor endpoints

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent story:** [STORY-009 — Resolve sub-agent federation onboarding gaps](../stories/STORY-009-subagent-federation-gaps.md)

## What

Added user-friendly REST path aliases alongside the canonical `/executor/skill/<name>` paths:

- `POST /skills/<name>/execute`
- `POST /tools/<name>/execute`
- `POST /subagents/<name>/execute`

All aliases accept the same body shape (input as root) and return the same response.

## Where

`packages/runtime/src/transport/server.ts` — route registration section (~line 706).

## Verified

Confirmed via `curl` during Expedia E2E session. 449/449 tests pass.
