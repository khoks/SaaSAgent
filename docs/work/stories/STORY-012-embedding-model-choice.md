# STORY-012 — Choose embedding model

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform architect, I need to choose the embedding model for semantic search and memory retrieval so that the vector store layer (ADR-008, Qdrant) has a defined embedding strategy.

## Context
Q4.6 from the 2026-04-28 grooming session. Options: Anthropic embeddings / OSS models (BGE, E5, nomic-embed) / host-supplied model. Self-hosted deployment requirement constrains cloud-only options.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q4.6 marked resolved.
