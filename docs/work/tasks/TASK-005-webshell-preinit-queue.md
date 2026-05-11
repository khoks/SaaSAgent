# TASK-005 — Web-shell pre-handshake event queueing

- **Status:** done
- **Story:** [STORY-008 — Close 5 enterprise-onboarding gaps](../stories/STORY-008-close-onboarding-gaps.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **Completed:** 2026-05-11

## What
DOM events (MutationObserver, IntersectionObserver, semantic custom events) that fire before the WebSocket handshake completes were silently dropped. The web shell now queues these in `pendingEmits[]` and flushes + rebinds the `composeCycleId` on the first layout broadcast received.

Added `emitOrQueue()` and `flushPendingEmits()` methods; wired flush into the `onLayout` handler.
