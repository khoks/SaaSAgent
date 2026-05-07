# STORY-010 — Sonnet planner + tool-use loop (Phase 2.1)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Three-slice Planner implementation:
- **2.1a** — `Planner` interface + `StubPlanner` + `NullMemoryProvider` seam. Closed the `user-message` routing gap (payload.text becomes intent, not the literal string "user-message"). 174 tests.
- **2.1b** — `SonnetPlanner`: extended `ModelProvider` for `tool_use` (ToolDefinition, content blocks, tool_result messages); ToolMapper bridges registry → Claude tool schema; multi-round tool_use loop. 207 tests.
- **2.1c** — Planner `toolResults` flows into `ComposeContext` and `HaikuComposer` prompt; transport integration test proves end-to-end. Live Chrome demo: `user-message` → `tool__fetch-product-info` → httpbin echo → composed Card.

## Done when
- StubPlanner routes `user-message` envelope text to intent correctly.
- SonnetPlanner drives multi-round tool_use with registered tools.
- Tool results appear in composer context and render in the shell.
- 207 tests passing.

## Result
Done. Commits `f6591a5` (2.1a) → `f34e79a` (2.1b) → `eacb86b` (2.1c). Live Chrome demo confirmed end-to-end.
