# STORY-010 — Define eventing model for DOM observation

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform architect, I need to define how the agent shell observes user activity on the host page so that the proactive engine has a reliable, low-overhead behavioral signal feed.

## Context
Q4.4 from the 2026-04-28 grooming session. Options: MutationObserver + IntersectionObserver + custom event channel. This feeds directly into the proactive engine (ADR-018) and the customer interaction profile (ADR-008).

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q4.4 marked resolved.
