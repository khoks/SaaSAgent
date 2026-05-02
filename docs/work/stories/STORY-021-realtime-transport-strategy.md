# STORY-021 — Define real-time transport strategy

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-003 — Close Batch 5 grooming decisions](../epics/EPIC-003-batch-5-grooming.md)

## User story
As a platform architect, I need to decide the real-time transport between the orchestrator and the agent shell UI so that streaming responses, proactive triggers, and future voice support are covered.

## Context
Q5.9 from the 2026-05-01 grooming session (Batch 5 — open). Options: WebSocket / SSE / WebRTC (voice) / hybrid. Must support streaming LLM output, proactive engine push notifications, and the voice modality path.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q5.9 marked resolved.
