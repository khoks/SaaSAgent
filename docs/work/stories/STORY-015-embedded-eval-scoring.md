# STORY-015 — Embedded eval scoring — per-turn quality signals (Phase 2.5)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As a SaaS operator, I need per-turn eval signals recorded per session so that I can measure response quality, track thumbs-up/down feedback, and feed signals into the churn model.

## What was built
- Protocol: `EvalSignal`, `EvalSignalKind` (`latency` | `thumbs-up` | `thumbs-down` | `task-complete` | `task-abandon`), `EvalSource` types
- `EvalProvider` interface + `KeyValueEvalProvider` with session-grouped storage
- WS intercept: `type:'eval-feedback'` envelopes bypass the planner and go directly to EvalProvider
- REST: `POST /eval` (record signal), `GET /eval/sessions/<id>` (retrieve; filter by kind/source)
- Runtime wiring: EvalProvider on `Runtime`, passed through to RuntimeServer
- 255 runtime tests post-2.5; 61 transport + eval tests

## Verified
Live: REST eval recording + filtering + WS feedback intercept verified against running runtime. All `/eval` REST endpoints return correct filtered results.

## Commit
`e6a4e54` on `main`
