# EPIC-007 — Bucket B data store providers

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Injectable provider implementations for all four non-Postgres stores in the polyglot memory architecture: Qdrant (vector recall), ClickHouse (time-series analytics), Kafka/Redpanda (event streaming), and Neo4j (graph store). All use a dependency-free injectable-client pattern — no hard npm deps — so they're testable without Docker in CI.

## Why
ADR-032 mandates the full polyglot stack from day one. These providers complete the memory seam so the derivation pipeline (Phase 4) can plug in real clients without structural changes.

## Done when (all satisfied)
- ✅ `QdrantVectorProvider`: semantic recall interface + injectable HTTP client + 10 tests
- ✅ `ClickHouseAnalyticsProvider`: time-series write/query interface + 9 tests
- ✅ `KafkaEventBusProvider` (Redpanda-compatible): produce/consume interface + 14 tests
- ✅ `Neo4jGraphProvider`: node/edge CRUD + Cypher query interface + 16 tests
- ✅ All providers wired into runtime barrel exports

## Commit
- `c46a366` — build(phase-5): Bucket A + B
