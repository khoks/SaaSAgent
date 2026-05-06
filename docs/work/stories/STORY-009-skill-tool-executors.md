# STORY-009 — Skill and Tool executors with REST endpoints (Phase 2.0c)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As the planner (and as a developer testing capabilities), I can invoke a registered Skill or Tool by name and receive a uniform `ExecutionResult` so that the planner layer calls `executor.execute(name, input)` the same way regardless of capability type.

## Context
With Skills/Tools registries in place (2.0b), execution was still missing. The planner needs a single interface — `executor.execute(name, input) → ExecutionResult` — whether the capability is an in-process function or an HTTP endpoint. REST endpoints expose the same execution surface for external testing.

## Done when
- `SkillExecutor` runs registered in-process skill functions.
- `ToolExecutor` forwards to registered HTTP Tool URLs via fetch.
- Both return uniform `ExecutionResult { ok, data?, error? }`.
- `POST /execute/skill/:name` and `POST /execute/tool/:name` REST endpoints.
- HTTP status mapping: `not-found` → 404, `invalid-input` → 400, `execution-error` → 502, `timeout` → 504.
- 27 executor unit tests + 10 REST endpoint integration tests.
- 160 total workspace tests green.
- Live smoke: 7/7 curl assertions pass.

## Resolution (2026-05-05)
Shipped as Phase 2.0c. Commit: f1e3304.
