# STORY-013 — Qdrant vector memory provider

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-015 — Bucket B: Polyglot storage providers sprint](../epics/EPIC-015-bucket-b-polyglot-storage.md)

## User story

As the runtime memory accessor router, I want a `QdrantMemoryProvider` so that semantic / vector similarity recall queries can be satisfied without requiring an external embedding service to be manually wired.

## Context

ADR-024 specified Qdrant as the vector store. The memory accessor router was wired in Phase 2.3.x but only backed by Postgres and Durable-File providers. This story adds the Qdrant backend, following the same dependency-free provider pattern (no external Qdrant SDK import; raw HTTP to Qdrant REST API).

## Done when

- `runtime/src/memory/qdrant.ts` implements `MemoryProvider` for vector upsert + cosine-similarity query.
- Provider registered in runtime barrel and selectable via `ChainedMemoryProvider`.
- Unit tests added and passing.
