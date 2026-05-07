# STORY-016 — Neo4j graph memory provider

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-015 — Bucket B: Polyglot storage providers sprint](../epics/EPIC-015-bucket-b-polyglot-storage.md)

## User story

As the Problem-Solution Graph extractor, I want a `Neo4jMemoryProvider` so that entity-relationship patterns extracted from conversations can be persisted and queried as a graph, enabling multi-hop reasoning over user history.

## Context

ADR-024 specified Neo4j for the graph layer of the memory accessor router. The provider uses Neo4j's Bolt HTTP endpoint, consistent with the dependency-free provider pattern. Graph tests added for node upsert + relationship traversal queries.

## Done when

- `runtime/src/memory/neo4j.ts` implements `MemoryProvider` for node upsert + Cypher queries.
- Provider registered and selectable in `ChainedMemoryProvider`.
- 16 graph tests added and passing.
