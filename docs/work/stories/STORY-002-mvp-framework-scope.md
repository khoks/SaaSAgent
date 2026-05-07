# STORY-002 — Define MVP framework scope for multi-framework rendering

- **Status:** done
- **Created:** 2026-04-28
- **Last updated:** 2026-05-07
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need to know which host UI frameworks the MVP must support so that the WC-wrap renderer and native-renderer escape hatch are scoped correctly.

## Context
ADR-010 settled WC-wrap default + native-renderer escape hatch. Open sub-question: MVP framework scope — React + WC only at MVP, defer Vue/Svelte/Angular to v1.5?

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.2 marked resolved.

## Resolution note
Resolved by implementation: WC-wrap default with native-renderer escape hatch; three render modes built (full-page / drawer / eject) in Bucket A (commit ).
