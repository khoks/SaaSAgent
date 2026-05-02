# STORY-015 — Define cross-store consistency failure-recovery semantics

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform engineer, I need to define the consistency model and failure-recovery semantics across the polyglot memory stores (PG + Qdrant + ClickHouse + Neo4j) so that data integrity guarantees are understood before implementation.

## Context
Q4.9 from the 2026-04-28 grooming session. The polyglot store (ADR-008) introduces distributed consistency challenges. Failure-recovery semantics (eventual consistency vs. saga patterns vs. compensating transactions) need to be established.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q4.9 marked resolved.
