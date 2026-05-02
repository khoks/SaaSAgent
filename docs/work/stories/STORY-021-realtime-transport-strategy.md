# STORY-021 — Define real-time transport strategy

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-004 — Close Batch 6 grooming decisions](../epics/EPIC-004-batch-6-grooming.md)

## User story
As a platform architect, I need to decide the real-time transport between the orchestrator and the agent shell UI so that streaming responses, proactive triggers, and future voice support are covered.

## Context
Q6.3 from Batch 6 (open). Options: WebSocket / SSE / WebRTC (voice) / hybrid. Must support streaming LLM output, proactive engine push notifications, and the voice modality path. INIT-002 suggests SSE for streaming output + WebSocket for bidirectional interaction emit as a sensible MVP default.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q6.3 marked resolved.
