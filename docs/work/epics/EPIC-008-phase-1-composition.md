# EPIC-008 — Phase 1 Composition

- **Status:** in-progress (Phase 1 gate satisfied 2026-05-03; LLM composer done; remaining: WC shell, themes)
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Phase 1 gate passes: end-to-end composed artifact renders from a hand-crafted layout-tree input. WC shell (side-panel), atomic UI component registry, theme token registry, UI Composer (Haiku + cached templates), and bidirectional typed-JSON instruction protocol all working.

## Why
Phase 1 is the composition substrate — the foundational layer that lets the planner (Phase 2) produce typed-JSON layout trees that the WC shell renders using the host's atomic design system. Without a working composition loop, all higher phases are blocked.

## Phase 1 gate
End-to-end composed artifact renders from a hand-crafted layout-tree input, with the renderer walking a `LayoutTree` → DOM, capturing user interactions, and emitting typed `InstructionEnvelope`s back to the runtime.

**Gate status: ✅ SATISFIED 2026-05-03** — full bidirectional loop (Composer → SSE → renderer → click → WS → re-compose → SSE → re-render) proven against live network sockets.

## Slices

### Slice 1.1 — Protocol package + stub composer + renderer — **done 2026-05-03**
- `@saasagent/protocol` package (PROTOCOL_VERSION 0.1.0)
- `DataSource` discriminated union (literal / memory / host-api / sub-agent / computed)
- `EmitSpec`, `LayoutNode`, `ComposedLayout` types
- `InstructionEnvelope` + `InstructionAck` (causality-tracked via `composeCycleId`)
- DTCG theme types
- `AtomicComponent` registry shape + `ComponentRegistry` map type
- Stub `UIComposer` (echo-mode, no LLM call yet)
- Layout renderer skeleton: walks `LayoutTree` → JSDOM, captures clicks, emits typed envelopes
- 18 tests passing across 5 packages; bidirectional loop validated end-to-end in JSDOM
- Commit: `5a4c97c`

### Slice 1.2 — Real SSE + WebSocket transport — **done 2026-05-03**
- Runtime HTTP server (`GET /health`, `GET /sse`, `WS /ws`) on configurable port
- `GET /sse` delivers welcome `ComposedLayout` event and streams subsequent layouts
- `WS /ws` receives `InstructionEnvelope` → re-compose → broadcasts updated layout via SSE
- `EmitTransport` interface promoted to `@saasagent/protocol` (shared by renderer + client)
- Web-shell SSE + WebSocket client with `eventsource` polyfill for Node 24
- Integration test runs full loop against live runtime instance
- 29 tests passing across 5 packages; manual curl smoke confirmed
- Commit: `b796d02`

### Slice 1.3 — WC shell side-panel + atomic component registry *(backlog)*
- `<saas-agent />` custom element upgraded with side-panel render mode
- Atomic UI Components registry: schema, storage, hot-reload
- WC-wrap default renderer wired to real DOM

### Slice 1.4 — Theme tokens registry *(backlog)*
- DTCG canonical schema
- Style Dictionary importer
- CSS variable fallback emission

### Slice 1.5 — Live UI Composer — **done 2026-05-03**
- `AnthropicProvider` + `MockProvider` behind `ModelProvider` abstraction (ADR-007 honored)
- `HaikuComposer` pipeline: intent cache → `claude-haiku-4-5` call → Zod-validate → cache
- Two-layer caching: `CompositionCache` (in-process) + Anthropic server-side prompt cache
- `extractFirstJsonObject` strips markdown fences; Sonnet fallback for repeated haiku failures
- Schema kept loose by design (ADR-039): recursive `LayoutNode.children` prevents strict Zod inference
- 42 tests passing across 5 packages; live smoke confirmed against real Anthropic API
- Commit: `aed268f`

## Child stories
- [STORY-024 — Slice 1.1: protocol package, stub composer, renderer validated](../stories/STORY-024-phase-1-slice-1-1-protocol.md)
- [STORY-025 — Slice 1.2: real SSE + WebSocket transport validated over live network](../stories/STORY-025-phase-1-slice-1-2-transport.md)
- [STORY-026 — Slice 1.3: real Composer LLM call — HaikuComposer + ModelProvider abstraction](../stories/STORY-026-phase-1-slice-1-3-composer.md)
