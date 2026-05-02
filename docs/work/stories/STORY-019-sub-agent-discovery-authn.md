# STORY-019 — Define sub-agent discovery and authn/authz

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-003 — Close Batch 5 grooming decisions](../epics/EPIC-003-batch-5-grooming.md)

## User story
As a platform security architect, I need to define how the orchestrator discovers sub-agents at runtime and how trust is established so that the sub-agent registry is secure by default.

## Context
Q5.4 from the 2026-05-01 grooming session (Batch 5). Answered: **push self-registration + heartbeat + mTLS (intranet trust); JWT for admin APIs**. Captured as ADR-029.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR. ✅
- INIT-001 Q5.4 marked resolved. ✅
