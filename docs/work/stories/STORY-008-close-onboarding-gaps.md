# STORY-008 — Close 5 enterprise-onboarding gaps

- **Status:** in-review
- **Epic:** [EPIC-002 — Expedia enterprise demo + onboarding validation](../epics/EPIC-002-expedia-demo-onboarding-validation.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **PR:** khoks/SaaSAgent#30 (commit `a35530d`, 16 files, +1,224/−37)

## User story
As an enterprise developer integrating SaaSAgent, the runtime gives me clear feedback when I call endpoints incorrectly, tells me what mode it's running in, and the web shell doesn't drop events before the WS handshake completes.

## Gaps found (via Expedia E2E)

| Gap | Symptom |
|---|---|
| #1 Pre-handshake event loss | DOM events emitted before WS connected were dropped silently |
| #2 `/federate` empty on stub | Sub-agent returned `{}` with no hint of what skills were available |
| #3 No REST path aliases | Only `POST /executor/skill/<n>` worked; `/skills/<n>/execute` returned 404 |
| #4 Opaque input-wrapping error | Sending `{input:{...}}` returned terse 400; no example shown |
| #5 No dev-mode discoverability | No way to tell from `/health` if planner/composer were real or stub |

## Children

| ID | Title | Status |
|---|---|---|
| [TASK-001](../tasks/TASK-001-dev-mode-health-discoverability.md) | dev-mode discoverability in /health | done |
| [TASK-002](../tasks/TASK-002-executor-input-wrapping-error.md) | Bad input-wrapping 400 with example | done |
| [TASK-003](../tasks/TASK-003-rest-path-aliases.md) | REST path aliases for skill/tool/subagent | done |
| [TASK-004](../tasks/TASK-004-federate-fallback-skills.md) | /federate fallback includes available skills | done |
| [TASK-005](../tasks/TASK-005-webshell-preinit-queue.md) | Web-shell pre-handshake event queueing | done |

## Acceptance criteria
- [x] 449/449 tests pass after fixes
- [x] All 5 fixes verified live in Chrome against the Expedia integration
- [x] `/health` exposes `mode: 'stub'|'live'` + `devHint` block when stub
- [x] `/federate` returns available skills in response even when 0 invocations fired
- [x] `/skills/<name>/execute`, `/tools/<name>/call`, `/sub-agents/<name>/federate` all work
- [x] Bad `{input:{...}}` wrapping returns 400 with `{error, detail, example}`
- [x] Pre-handshake emits are queued and flushed on first layout
