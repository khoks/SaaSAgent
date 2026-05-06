# STORY-010 — Planner integration (Phase 2.1)

- **Status:** backlog
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As an end-user, my free-text message is understood by a planning model (Sonnet) which selects the right Skills/Tools to invoke and drives HaikuComposer to render the response — completing the first true conversational turn.

## Context
Phase 2.0a/b/c laid the infrastructure (input bar, registries, executors). Phase 2.1 connects them with the Planner: a Sonnet-backed agent that reads user intent, queries the capability registries, calls `executor.execute(name, input)`, and hands results to HaikuComposer for layout production. This is the Phase 2 gate.

## Done when
- Planner receives `user-message` InstructionEnvelope.
- Planner queries Skills + Tools registries for available capabilities.
- Planner invokes at least 1 Skill and 1 Tool per turn (where applicable).
- Planner result drives HaikuComposer → SSE → browser render.
- Full round-trip verified end-to-end in Chrome.
- Phase 2 gate satisfied.
