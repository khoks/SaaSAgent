# STORY-011 — Define eval target metrics and scoring approach

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform engineer, I need to decide how agent responses are evaluated (metrics + scoring mechanism) so that the live and offline eval pipeline (ADR-008) has concrete targets to optimize against.

## Context
Q4.5 from the 2026-04-28 grooming session. Options: LLM-as-judge / heuristics / embedded eval models / hybrid scoring. The eval framework was established as a first-class concern in Q6 (ADR-008).

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q4.5 marked resolved.
