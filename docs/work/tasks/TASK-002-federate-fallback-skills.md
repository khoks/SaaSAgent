# TASK-002 — /federate fallback includes available skills

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent story:** [STORY-009 — Resolve sub-agent federation onboarding gaps](../stories/STORY-009-subagent-federation-gaps.md)

## What

When a `/federate` call fires but the sub-agent's planner is Stub (no LLM key), the response previously returned `{}` — offering no signal to the caller about what the sub-agent could do.

Now the response includes an `availableSkills` array listing every skill registered with the sub-agent, so the enterprise developer can pivot to direct `/executor/skill/<name>` calls on the sub-agent port.

## Where

`packages/runtime/src/transport/server.ts` — `/federate` handler.

## Verified

Confirmed via `curl` during Expedia E2E session: sub-agent on `:8082` returned `{ availableSkills: ["plan-trip", ...] }`. 449/449 tests pass including a new integration test for the stub-fallback path.
