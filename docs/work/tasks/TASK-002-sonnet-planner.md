# TASK-002 — SonnetPlanner multi-round tool_use loop (Phase 2.1b)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent story:** [STORY-010 — Planner integration (Phase 2.1)](../stories/STORY-010-planner-integration.md)
- **Commit:** f34e79a

## What
Implement `SonnetPlanner` — a real LLM-backed planner using `claude-sonnet-4-6` that drives a multi-round `tool_use` loop via the Anthropic API. Includes `tool-mapper` (converts Skills/Tools registry entries into Claude tool schemas) and uses `AnthropicProvider` for the model calls.

## Why
`StubPlanner` proved the seam but cannot actually reason about user intent or invoke capabilities. `SonnetPlanner` adds the reasoning layer that selects and executes the right tool per turn.

## Done
- `SonnetPlanner` drives multi-round tool_use: sends tools, receives `tool_use` blocks, calls `executor.execute`, sends `tool_result`, loops until `stop_reason === "end_turn"`.
- `ToolMapper` converts registry entries to Anthropic tool schema format.
- `AnthropicProvider` extended to handle `tool_use` content blocks.
- 207 tests pass across workspace (164 runtime, 12 SonnetPlanner, 10 tool-mapper, 6 anthropic tool_use).
