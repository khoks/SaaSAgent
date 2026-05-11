# TASK-003 — Bad input wrapping returns 400 with example

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent story:** [STORY-009 — Resolve sub-agent federation onboarding gaps](../stories/STORY-009-subagent-federation-gaps.md)

## What

Developer expectation (from old docs): `POST /executor/skill/<name>` body `{ input: { ... } }`.
Actual contract: body IS the input (no `input` wrapper key).

When a caller sends `{ input: { ... } }`, the runtime now returns HTTP 400 with:
```json
{
  "error": "Bad request shape",
  "detail": "Do not wrap the input in an 'input' key — send the payload as the body root.",
  "example": "curl -X POST http://localhost:8080/executor/skill/search-flights -d '{\"origin\":\"SFO\"}'"
}
```

## Where

`packages/runtime/src/transport/server.ts` — skill executor route handler (~line 728).

## Verified

Confirmed via `curl` during Expedia E2E session. 449/449 tests pass.
