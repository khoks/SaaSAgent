# TASK-004 — /health dev-mode discoverability

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent story:** [STORY-009 — Resolve sub-agent federation onboarding gaps](../stories/STORY-009-subagent-federation-gaps.md)

## What

When `ANTHROPIC_API_KEY` is absent, the runtime silently falls back to StubComposer + StubPlanner. Enterprise developers had no way to know they were running in stub mode without reading source code.

Changes:
1. `GET /health` now returns `mode: 'stub' | 'live'` at the top level.
2. When `mode === 'stub'`, `/health` includes a `devHint` object:
   - `message`: human-readable explanation
   - `callSkill`: example curl for direct skill invocation
   - `callTool`: example curl for tool execution
   - `callSubAgent`: example curl for sub-agent federation
   - `registeredSkills`: array of skill names currently registered (including sub-agent descriptors)
3. Boot log emits a prominent multi-line `mode=STUB` banner with the same curl example.

## Where

`packages/runtime/src/transport/server.ts` (~line 329) and `packages/runtime/src/index.ts` (~line 359).

## Verified

Confirmed via `curl http://localhost:8080/health` during Expedia E2E session. Boot log banner visible in terminal. 449/449 tests pass.
