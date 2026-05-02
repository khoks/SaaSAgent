# STORY-018 — Define sub-agent federation protocol

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-003 — Close Batch 5 grooming decisions](../epics/EPIC-003-batch-5-grooming.md)

## User story
As a platform architect, I need to decide the wire protocol for communication between the orchestrator and federated sub-agent runtimes so that the SDK and registry interaction model is concretely specified.

## Context
Q5.3 from the 2026-05-01 grooming session (Batch 5 — open). Options: gRPC / HTTP / WebSocket / SSE / hybrid. Sub-agents are separate federated runtimes (ADR-021) with SDK-defined interaction protocols.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q5.3 marked resolved.
