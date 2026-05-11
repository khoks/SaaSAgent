# TASK-004 — /federate fallback includes available skills

- **Status:** done
- **Story:** [STORY-008 — Close 5 enterprise-onboarding gaps](../stories/STORY-008-close-onboarding-gaps.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **Completed:** 2026-05-11

## What
When the sub-agent's planner is stub (no LLM) and fires zero invocations, `POST /federate` previously returned `{}`. It now includes `availableSkills: [...]` in the response so the developer knows the sub-agent registered correctly and can call skills directly via `/executor/skill/<name>` on the sub-agent port.
