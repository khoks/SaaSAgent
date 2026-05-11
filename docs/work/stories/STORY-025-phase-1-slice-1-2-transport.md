# STORY-025 — Slice 1.2: real SSE + WebSocket transport validated over live network

- **Status:** done
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Completed:** 2026-05-03
- **Parent epic:** [EPIC-008 — Phase 1 Composition](../epics/EPIC-008-phase-1-composition.md)

## Outcome
Real bidirectional transport over live network sockets: SSE delivers `ComposedLayout` events from the runtime to the renderer; WebSocket carries `InstructionEnvelope`s back. Integration test and manual smoke (`curl`) both confirm the full round-trip. **Phase 1 gate satisfied.**

## Why
Slice 1.1 validated the protocol in-process (JSDOM). Slice 1.2 validates it over a real network, de-risking all later phases that depend on the SSE/WebSocket channel (Phases 2-9). The Phase 1 gate ("end-to-end composed artifact renders from a hand-crafted layout-tree input") is met once layout events flow over SSE to a connected client and instruction emits return over WebSocket.

## What was completed

### Runtime — SSE + WebSocket server (in `@saasagent/runtime`)
- HTTP server on configurable port (`SAAS_AGENT_PORT` env, default 3000)
- `GET /health` → `{"status":"ok","sseClients":<N>}`
- `GET /sse` → SSE stream: preamble + welcome layout event with full `ComposedLayout` JSON
- `WS /ws` → bidirectional WebSocket: receives `InstructionEnvelope` → re-composes → broadcasts updated layout SSE to all SSE clients

### Web shell — SSE + WebSocket client (in `@saasagent/web-shell`)
- `EventSource`-based SSE client (with `eventsource` polyfill for Node 24 compatibility)
- `WebSocket` client for instruction emit
- `EmitTransport` interface promoted to `@saasagent/protocol` (shared by renderer + client)
- Integration test: connects both channels, emits a typed `InstructionEnvelope`, asserts the runtime re-broadcasts a new layout event

### Test coverage
- 29 tests across 5 packages (protocol 7, runtime 9, sdk 2, web-shell 11, cli pass-with-no-tests)
- Full bidirectional loop integration test runs against a live runtime instance started in-process for the test

### Manual smoke (curl + wscat)
- `curl /health` → `{"status":"ok","sseClients":0}`
- `curl /sse` → preamble + welcome layout event with full JSON
- `wscat /ws` → instruction emit triggers re-compose + broadcast to SSE listener

## Commit
`b796d02 build(phase-1.2): real SSE + WebSocket transport — full bidirectional loop validated over live network`

## Done when
- ✅ Runtime serves `GET /health`, `GET /sse`, `WS /ws`.
- ✅ `GET /sse` delivers a valid `ComposedLayout` JSON envelope.
- ✅ `WS /ws` receives an `InstructionEnvelope`, re-composes, broadcasts updated layout via SSE.
- ✅ All 29 tests pass (`pnpm test` green).
- ✅ Manual curl smoke passes end-to-end.
- ✅ Phase 1 gate satisfied: end-to-end composed artifact delivered over live network from hand-crafted layout-tree input.
