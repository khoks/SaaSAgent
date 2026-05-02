# STORY-022 — Define adapters registry transport

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-004 — Close Batch 6 grooming decisions](../epics/EPIC-004-batch-6-grooming.md)

## User story
As a platform architect, I need to define how adapters bridge the host page's event bus to the platform's Redpanda topics so that the Adapters Registry (ADR-022) has a concrete data-path specification.

## Context
Q6.4 from Batch 6 (open). The Adapters Registry was introduced in ADR-022. How host-side events (DOM, custom bus) are translated and forwarded to the Redpanda stream-processing layer needs to be defined. INIT-002 suggests simple webhook adapter at MVP; production-grade SDK adapter library at v1.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q6.4 marked resolved.
