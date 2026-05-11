# TASK-003 — REST path aliases for skill/tool/subagent

- **Status:** done
- **Story:** [STORY-008 — Close 5 enterprise-onboarding gaps](../stories/STORY-008-close-onboarding-gaps.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **Completed:** 2026-05-11

## What
Added REST path aliases so enterprise devs can use intuitive resource-oriented URLs:
- `POST /skills/<name>/execute` (alias for `POST /executor/skill/<name>`)
- `POST /tools/<name>/call` (alias for `POST /executor/tool/<name>`)
- `POST /sub-agents/<name>/federate` (alias for `POST /federate`)

Previously only the `/executor/*` paths worked; the resource-path forms returned 404.
