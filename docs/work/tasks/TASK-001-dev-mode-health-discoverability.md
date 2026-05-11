# TASK-001 — dev-mode discoverability in /health

- **Status:** done
- **Story:** [STORY-008 — Close 5 enterprise-onboarding gaps](../stories/STORY-008-close-onboarding-gaps.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **Completed:** 2026-05-11

## What
`GET /health` now exposes `mode: 'stub' | 'live'` and, when stub, a `devHint` block containing `{message, callSkill, callTool, callSubAgent, registeredSkills}`. The runtime also logs a prominent multi-line `mode=STUB` banner at boot with a curl example.

## Files changed
- `packages/runtime/src/transport/server.ts:329`
- `packages/runtime/src/index.ts:359`
