# EPIC-015 — Bucket B: Polyglot storage providers sprint

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

Four additional memory/storage providers shipped in the same sprint as Bucket A (commit `c46a366`): Qdrant (vector), ClickHouse (time-series analytics), Kafka/Redpanda (event streaming), and Neo4j (graph). These complete the polyglot data-layer ADRs.

## Why

The Phase 2 memory accessor router was wired but only backed by the Postgres and Durable-File providers built in Phase 2.3.x. Bucket B fills in the remaining storage backends required by ADR-032 (churn pipeline) and ADR-024/026 (graph + vector recall).

## Done when

- All four STORY items implemented, tested, and committed.
- New providers integrated into the runtime barrel and MonorepoWorkspace.
- Full test suite (468 tests) remains green after addition.

## Child stories

- [STORY-013 — Qdrant vector memory provider](../stories/STORY-013-qdrant-provider.md)
- [STORY-014 — ClickHouse time-series analytics provider](../stories/STORY-014-clickhouse-provider.md)
- [STORY-015 — Kafka / Redpanda event streaming provider](../stories/STORY-015-kafka-provider.md)
- [STORY-016 — Neo4j graph memory provider](../stories/STORY-016-neo4j-provider.md)
