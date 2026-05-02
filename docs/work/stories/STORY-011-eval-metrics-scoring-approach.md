# STORY-011 — Define eval target metrics and scoring approach

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform engineer, I need to decide how agent responses are evaluated (metrics + scoring mechanism) so that the live and offline eval pipeline has concrete targets to optimize against.

## Context
Q4.5 from the 2026-05-01 grooming session. Decision: hybrid scoring + **auto-generated per-capability eval from registry metadata** (skill and sub-agent registries generate custom evals on the fly) + bundled eval backend + bundled dashboard. High-novelty. Captured as ADR-023.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR. ✅ ADR-023
- INIT-001 Q4.5 marked resolved. ✅
