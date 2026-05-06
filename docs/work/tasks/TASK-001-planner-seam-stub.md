# TASK-001 — Planner seam + StubPlanner (Phase 2.1a)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent story:** [STORY-010 — Planner integration (Phase 2.1)](../stories/STORY-010-planner-integration.md)
- **Commit:** f6591a5

## What
Add a `Planner` interface seam to the runtime so the `user-message` InstructionEnvelope is routed to a planner rather than dropped. Implement `StubPlanner` (pass-through, no LLM call) and `NullMemoryProvider` to complete the type surface.

## Why
Phase 2.0 built the input bar, registries, and executors but left `user-message` handling as a no-op gap. This task closes that gap with the minimum viable wiring so Phase 2.1b can drop in the real Sonnet planner.

## Done
- `Planner` interface + `PlannerResult` types defined.
- `StubPlanner` echoes user text as a raw layout-tree card.
- `NullMemoryProvider` satisfies the `MemoryProvider` interface with no-op reads/writes.
- Runtime `buildPlanner` factory wires `StubPlanner` by default.
- All existing tests continue to pass.
