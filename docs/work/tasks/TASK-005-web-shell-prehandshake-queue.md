# TASK-005 — Web-shell pre-handshake event queue

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent story:** [STORY-009 — Resolve sub-agent federation onboarding gaps](../stories/STORY-009-subagent-federation-gaps.md)

## What

Events emitted by the host page (DOM mutations, semantic events, mobile-context) before the WebSocket handshake completed were silently dropped. This caused early interaction signals to be lost, especially on slow networks.

Fix: the `<saas-agent>` web-shell now maintains a `pendingEmits` queue. Any `emitOrQueue()` call before the WS connection is established appends to the queue. On first `onLayout` (the welcome layout received via SSE), the shell:
1. Establishes or awaits the WS connection.
2. Flushes `pendingEmits` in order.
3. Rebinds the `composeCycleId` to the one in the welcome layout, so all queued events are attributed to the correct cycle.

## Where

`packages/web-shell/src/index.ts` — `emitOrQueue`, `flushPendingEmits`, and `onLayout` wiring.

## Verified

Confirmed live: after the fix, early DOM events logged by the runtime show a valid non-`no-cycle` composeCycleId. 449/449 tests pass.
