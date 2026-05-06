# TASK-003 — Wire planner toolResults into HaikuComposer (Phase 2.1c)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent story:** [STORY-010 — Planner integration (Phase 2.1)](../stories/STORY-010-planner-integration.md)
- **Commit:** eacb86b

## What
Extend `ComposeContext` to carry `toolResults` from the planner, thread them through `RuntimeServer.handleWsConnection`, and update `HaikuComposer` to format tool results into the user prompt and bypass the layout cache when tool data is present.

## Why
`SonnetPlanner` returns tool results but they were not yet passed to the composer. This task closes the final gap so real data from HTTP tools reaches the rendered Card artifact in the browser.

## Done
- `ComposeContext.toolResults?: ToolResult[]` added.
- `RuntimeServer` passes planner `toolResults` to `HaikuComposer.compose(ctx)`.
- `HaikuComposer` formats tool results as `[Tool results]\n<json>` in the user prompt.
- Cache bypass when `toolResults` present (data varies per turn).
- 207 tests pass; 18 transport tests confirm end-to-end flow.
- Phase 2 gate verified live in Chrome: `user-message → tool__fetch-product-info({productId:"tv-55"}) → ok (373ms) → HaikuComposer rendered httpbin echo as Card`.
