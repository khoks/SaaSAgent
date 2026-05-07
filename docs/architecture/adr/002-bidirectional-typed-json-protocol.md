# ADR-002: Bidirectional typed-JSON protocol (SSE + WebSocket)

**Status:** accepted
**Decision date:** 2026-04-16

## Context

The shell needs to receive composed UI layouts from the runtime AND emit user
interactions back. Three protocol shapes were considered:

1. **HTTP polling** — simple, but adds latency + load that scales linearly
   with the number of connected shells.
2. **WebSocket bidirectional** — efficient and full-duplex, but harder to
   debug (binary framing on the wire) and behind some corporate proxies.
3. **SSE for server→client + WebSocket for client→server** — splits read /
   write paths. SSE is debuggable in any browser dev tools (text/event-stream
   over plain HTTP); WebSocket only handles the click→runtime emit.

## Decision

**Use SSE for runtime→shell layout streams and WebSocket for shell→runtime
instruction emits.** Layouts ship as `event: layout\ndata: <json>` SSE
events. Instructions ship as `InstructionEnvelope` JSON over WebSocket.

Both directions speak typed JSON only — no protobuf, no MessagePack, no binary
framing. Network bytes are inspectable in any browser tab.

## Consequences

**Pro:**
- A developer with cURL and `wscat` can drive the protocol manually.
- SSE auto-reconnects on transient network failures, courtesy of the
  browser's EventSource implementation.
- Instructions and layouts have separate flow control — a chatty user can't
  starve the layout stream.

**Con:**
- Two transports to keep in sync — version mismatches must be caught at
  PROTOCOL_VERSION negotiation.
- Some corporate proxies disable SSE — we document a fallback to polling
  for that edge case in the troubleshooting guide.

## Implementation

- `RuntimeServer` exposes `GET /sse` (server-sent layouts + status events)
  and `WS /ws` (instruction envelopes).
- `PROTOCOL_VERSION` exported from `@saasagent/protocol`; bumped on
  any wire-shape change.
