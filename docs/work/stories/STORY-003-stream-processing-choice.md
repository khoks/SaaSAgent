# STORY-003 — Choose stream processing approach for derivation pipeline

- **Status:** done
- **Created:** 2026-04-28
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need to decide the stream processing technology for the continuous derivation pipeline (interaction → profile → summaries → problem-solution graph → eval) so that the memory architecture can be implemented.

## Context
Q6 (now ADR-008) established the polyglot memory store. The derivation pipeline that continuously processes raw interactions into derived artifacts needs an engine. Options posed: in-process / Redpanda / Kafka / Temporal.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.3 marked resolved.
