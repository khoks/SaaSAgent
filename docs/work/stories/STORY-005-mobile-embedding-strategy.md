# STORY-005 — Decide mobile embedding strategy

- **Status:** done (resolved via ADR-017 — WebView bridge with mobile-context-aware composition)
- **Created:** 2026-04-28
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need to decide how the agent shell embeds in mobile applications so that mobile is accounted for in the WC/native rendering architecture.

## Context
The embeddable shell (ADR-004) was scoped for web. Mobile embedding was surfaced in Batch 3 as an open question. Options posed: React Native bridge / native iOS+Android SDKs / WebView bridge.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.5 marked resolved.
