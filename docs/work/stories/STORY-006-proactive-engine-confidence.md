# STORY-006 — Define proactive engine confidence and attention-budget model

- **Status:** done (resolved via ADR-018 + ADR-019 — multi-signal scoring + combined budget; tier/quota as separate concern)
- **Created:** 2026-04-28
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need a formal model for when the proactive engine surfaces suggestions and how it manages per-user attention budget so that the proactive UX is not annoying and remains trust-preserving.

## Context
The proactive engine was identified as a core differentiator (novel-ideas). The confidence model (multi-signal scoring → learned trigger threshold) and attention budget (hard cap MVP → cap+bucket+per-user v1) were sketched in the extract-insights output for the 2026-04-28 session, but not formally decided. This decision gates the proactive UX implementation.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.6 marked resolved.
