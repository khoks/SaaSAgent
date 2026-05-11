# STORY-009 — Real SSE and WebSocket transport

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User story

As a developer, I need the WC shell to connect to the runtime over real network sockets (SSE for streaming planner output, WebSocket for bidirectional instruction emit) so that the full Composer → renderer → click → re-compose loop is proven on a real network, not just in-memory.

## Done when

- `GET /health` → `{"status":"ok","sseClients":0}`.
- `GET /sse` → preamble + welcome layout event with full ComposedLayout JSON.
- `WS /ws` → bidirectional; instruction emit re-composes + broadcasts over SSE.
- Integration test runs full loop over real network sockets.
- 29 tests passing across 5 packages.
- `eventsource` package polyfill applied for Node 24 (no native `EventSource` global).

## Completion notes

Committed b796d02 (Phase 1.2). 14 files, 769 insertions. `EmitTransport` type moved from web-shell to `@saasagent/protocol` so both renderer and client share the definition.
