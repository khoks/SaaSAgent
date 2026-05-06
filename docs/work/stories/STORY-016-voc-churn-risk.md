# STORY-016 — VoC + Customer Churn Risk (Phase 2.6)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As a SaaS operator, I need a churn-risk score derived from eval signals so that I can identify at-risk customers and have the planner make informed decisions about which capabilities to surface.

## What was built
- `ChurnRiskProvider` interface + `HeuristicChurnRiskProvider`: scores sessions from eval signals using a ratio heuristic (`thumbs-down / total` vs thresholds)
- Risk levels: `low` | `medium` | `high` with human-readable `factors` array
- REST: `GET /churn/<sessionId>` (compute on demand), `GET /churn` (all sessions, optional `?minRisk=medium|high`)
- Runtime wiring: shared `EvalProvider` + `ChurnRiskProvider` instances
- 273 runtime tests post-2.6; 65 transport tests

## Notes
- Current `HeuristicChurnRiskProvider` is a stub (ratio scorer). Real LightGBM training pipeline deferred to future requirements (needs ClickHouse persistence + training infrastructure per ADR-032).
- Closes ADR-032 loop at the MVP level; full ML pipeline is a Phase 4 deliverable.

## Verified
Live: 3 sessions seeded with different thumbs-up/down ratios → `/churn` returned 3 sessions with correct risk levels (`low`, `medium`, `high`) and human-readable factor strings.

## Commit
`5934a15` on `main`
