# STORY-018 — Define sub-agent federation protocol

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-003 — Close Batch 5 grooming decisions](../epics/EPIC-003-batch-5-grooming.md)

## User story
As a platform architect, I need to decide the wire protocol for communication between the orchestrator and federated sub-agent runtimes so that the SDK and registry interaction model is concretely specified.

## Context
Q5.3 from the 2026-05-01 grooming session (Batch 5). Answered: **HTTP REST for registration/health/registry/metadata; gRPC bidirectional streaming for runtime**. Captured as ADR-028.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR. ✅
- INIT-001 Q5.3 marked resolved. ✅
