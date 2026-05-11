# STORY-009 — Resolve sub-agent federation onboarding gaps

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent epic:** [EPIC-010 — Expedia demo vertical (Phase 8)](../epics/EPIC-010-expedia-demo-vertical.md)

## Context

Five concrete gaps were surfaced and fixed within the same Expedia E2E session (2026-05-10). 449/449 tests pass after all fixes. Each fix was verified live in Chrome.

## Gaps fixed

| # | Gap | Fix | Task |
|---|---|---|---|
| 1 | `/federate` returns `{}` when sub-agent planner is Stub | Response now includes `availableSkills` list so caller knows what the sub-agent can do | [TASK-002](../tasks/TASK-002-federate-fallback-skills.md) |
| 2 | Skill executor path mismatch (`{input:...}` wrapping) | Returns 400 with descriptive error message + correct `curl` example | [TASK-003](../tasks/TASK-003-bad-input-wrapping-400.md) |
| 3 | No explicit signal when LLM key is missing | `/health` exposes `mode: 'stub'|'live'` + `devHint` block; boot logs prominent multi-line stub banner | [TASK-004](../tasks/TASK-004-health-devmode-discoverability.md) |
| 4 | Sub-agent registration not visible in `/health` | `devHint.registeredSkills` includes sub-agent descriptors and example curl | [TASK-004](../tasks/TASK-004-health-devmode-discoverability.md) |
| 5 | REST path ambiguity (`/executor/skill/<n>` undiscoverable) | `POST /skills/<n>/execute`, `/tools/<n>/execute`, `/subagents/<n>/execute` aliases added alongside canonical paths | [TASK-001](../tasks/TASK-001-rest-path-aliases.md) |

## Child tasks
- [TASK-001 — REST path aliases for executor endpoints](../tasks/TASK-001-rest-path-aliases.md)
- [TASK-002 — /federate fallback includes available skills](../tasks/TASK-002-federate-fallback-skills.md)
- [TASK-003 — Bad input wrapping returns 400 with example](../tasks/TASK-003-bad-input-wrapping-400.md)
- [TASK-004 — /health dev-mode discoverability](../tasks/TASK-004-health-devmode-discoverability.md)
- [TASK-005 — Web-shell pre-handshake event queue](../tasks/TASK-005-web-shell-prehandshake-queue.md)

## Additional fix

A sixth issue was discovered and fixed in the same session: pre-handshake events from the web-shell were dropped before the WebSocket connection was established. The shell now queues them and flushes on first connect, rebinding the cycle-id from the welcome layout. See [TASK-005](../tasks/TASK-005-web-shell-prehandshake-queue.md).
