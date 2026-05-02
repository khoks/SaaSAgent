# STORY-012 — Choose embedding model

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform architect, I need to choose the embedding model for semantic search and memory retrieval so that the vector store layer (Qdrant) has a defined embedding strategy.

## Context
Q4.6 from the 2026-05-01 grooming session. Decision: **host-supplied embedding model via adapter** (required for production); bundled `nomic-embed-text-v1.5` for dev/demo. Captured as ADR-024.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR. ✅ ADR-024
- INIT-001 Q4.6 marked resolved. ✅
