# STORY-027 — Slice 1.3.1: ErrorEnvelope as first-class SSE protocol event

- **Status:** done
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Done at:** 2026-05-03
- **Parent epic:** [EPIC-008 — Phase 1 Composition](../epics/EPIC-008-phase-1-composition.md)

## What was built

Composer-error propagation path: when `HaikuComposer` fails, the runtime now emits a typed `ErrorEnvelope` SSE event (`event: error`) instead of silently hanging the connection. The shell can dispatch on this event to render an error layout from registered primitives.

### Protocol additions (`@saasagent/protocol`)
- `ErrorEnvelope` type: `{ type: 'error'; code: string; message: string; composeCycleId?: string }`
- `ErrorCode` discriminated union: `'composer-error' | 'network-error' | 'unknown-error'`

### Runtime changes
- `RuntimeServer.handleRequest` emits `event: error\ndata: {...}\n\n` when `HaikuComposer` throws
- Error classified into `ErrorCode` before emission
- SSE connection kept alive after error so shell can re-request

### Web-shell additions
- `onServerError` callback on SSE client — dispatches `ErrorEnvelope` to host-side error handler

### Tests
- 5 new tests for error propagation path (47 total across 5 packages)
- Covers: `composer-error` emit, `unknown-error` fallback, client `onServerError` dispatch

## Commit
`d39e3d4` — 13 files, 421 insertions

## Notes
- Decision to emit `ErrorEnvelope` as a first-class protocol type rather than relying on SSE stream close was confirmed as ADR-040.
- Phase 1.3.1 smoke: PowerShell's `HttpWebRequest` was eating chunked SSE writes — not a runtime bug; validated via `pnpm smoke:server` Node client (2.5 s end-to-end with real Anthropic API).
