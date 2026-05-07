# STORY-016 — Embedded eval scoring (Phase 2.5)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Per-turn quality signals embedded in the runtime:
- `EvalScore` type (heuristic + optional LLM-judge fields) in protocol.
- `EvalScorer` — heuristic scorer: intent-resolution rate, layout non-empty, tool-use latency, error rate.
- WS intercept: after each compose cycle, scorer runs and appends `EvalScore` to the SSE event stream.
- REST endpoint `GET /eval/scores` — returns the last N per-turn scores.
- Tests: scorer unit tests + transport integration test that verifies scores appear in SSE events.

## Done when
- Every composed turn produces an `EvalScore` attached to the SSE event.
- Scores are retrievable via REST.
- Heuristic scoring covers intent resolution, layout validity, latency, and error rate.

## Result
Done. Commit `e6a4e54`. Embedded eval scoring live; per-turn quality signals operational.
