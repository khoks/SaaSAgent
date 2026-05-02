# STORY-010 — Define eventing model for DOM observation

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform architect, I need to define how the agent shell observes user activity on the host page so that the proactive engine has a reliable, low-overhead behavioral signal feed.

## Context
Q4.4 from the 2026-05-01 grooming session. Decision: MutationObserver + IntersectionObserver + custom semantic event channel via a separate **Adapters Registry** (new first-class registry). Captured as ADR-022.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR. ✅ ADR-022
- INIT-001 Q4.4 marked resolved. ✅
