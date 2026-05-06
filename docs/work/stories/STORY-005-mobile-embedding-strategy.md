# STORY-005 — Decide mobile embedding strategy

- **Status:** done
- **Created:** 2026-04-28
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need to decide how the agent shell embeds in mobile applications so that mobile is accounted for in the WC/native rendering architecture.

## Context
The embeddable shell (ADR-004) was scoped for web. Mobile embedding was surfaced in Batch 3 as an open question. Options posed: React Native bridge / native iOS+Android SDKs / WebView bridge.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.5 marked resolved.

## Resolution
ADR-017 recorded: WebView bridge with mobile-context-aware composition at MVP; native iOS/Android SDKs deferred to v1.5. Closed batch 3 session 2026-04-28.
