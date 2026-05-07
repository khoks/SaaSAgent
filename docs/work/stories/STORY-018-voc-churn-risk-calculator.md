# STORY-018 — VoC + ChurnRiskCalculator (Phase 2.6)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Voice-of-customer pipeline + churn risk signal (Phase 2.6, ADR-032):
- `VoCExtractor` — scans session memory for negative feedback signals, friction patterns, unresolved intents; produces a `VoCRecord` per session.
- `ChurnRiskCalculator` interface + `SimpleChurnRiskCalculator` — scores churn risk (0–1) from a `VoCRecord`; high-risk sessions trigger planner suppression of experimental features.
- REST endpoint `GET /voc/records` and `GET /voc/churn-risk/:sessionId`.
- Tests: VoCExtractor unit tests (feedback count, friction threshold, unresolved intent ratio) + ChurnRiskCalculator scoring tests.

## Done when
- VoC records generated from session memory after each turn.
- Churn risk score available per session via REST.
- Planner gating: experimental features suppressed if churn risk > configurable threshold.

## Result
Done. Commit `5934a15`. VoC + ChurnRiskCalculator live; closes ADR-032 loop.
