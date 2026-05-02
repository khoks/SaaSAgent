# STORY-015 — Define cross-store consistency failure-recovery semantics

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-004 — Close Batch 6 grooming decisions](../epics/EPIC-004-batch-6-grooming.md)

## User story
As a platform engineer, I need to define the consistency model and failure-recovery semantics across the polyglot memory stores (PG + Qdrant + ClickHouse + Neo4j) so that data integrity guarantees are understood before implementation.

## Context
Q6.1 from Batch 6 (open). The polyglot store (ADR-008) introduces distributed consistency challenges. Failure-recovery semantics (eventual consistency vs. saga patterns vs. compensating transactions) need to be established. Non-blocking for MVP start but must be answered before implementation of the memory layer.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q6.1 marked resolved.
