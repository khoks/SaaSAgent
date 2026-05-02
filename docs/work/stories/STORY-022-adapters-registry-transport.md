# STORY-022 — Define adapters registry transport

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-003 — Close Batch 5 grooming decisions](../epics/EPIC-003-batch-5-grooming.md)

## User story
As a platform architect, I need to define how adapters bridge the host page's event bus to the platform's Redpanda topics so that the Adapters Registry (ADR-022) has a concrete data-path specification.

## Context
Q5.10 from the 2026-05-01 grooming session (Batch 5 — open). The Adapters Registry was introduced in ADR-022 as a first-class component. How host-side events (DOM, custom bus) are translated and forwarded to the Redpanda stream-processing layer needs to be defined.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q5.10 marked resolved.
