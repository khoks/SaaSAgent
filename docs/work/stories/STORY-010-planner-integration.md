# STORY-010 — Planner integration (Phase 2.1)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
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

## Completion notes (2026-05-05)
Delivered in 3 slices:
- **2.1a** (f6591a5): Planner seam + StubPlanner + NullMemoryProvider — closed `user-message` routing gap.
- **2.1b** (f34e79a): SonnetPlanner — claude-sonnet-4-6 multi-round `tool_use` loop with tool-mapper.
- **2.1c** (eacb86b): Planner `toolResults` wired into HaikuComposer + ComposeContext.

Phase 2 gate verified live in Chrome: `user-message → tool__fetch-product-info({productId:"tv-55"}) → ok (373ms) → composer rendered httpbin echo as Card`.

## Child tasks
- [TASK-001 — Planner seam + StubPlanner (2.1a)](../tasks/TASK-001-planner-seam-stub.md) — done
- [TASK-002 — SonnetPlanner multi-round tool_use loop (2.1b)](../tasks/TASK-002-sonnet-planner.md) — done
- [TASK-003 — Wire planner toolResults into HaikuComposer (2.1c)](../tasks/TASK-003-planner-composer-wire.md) — done
