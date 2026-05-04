# EPIC-008 — Phase 1 Composition

- **Status:** in-progress
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Phase 1 gate passes: end-to-end composed artifact renders from a hand-crafted layout-tree input. WC shell (side-panel), atomic UI component registry, theme token registry, UI Composer (Haiku + cached templates), and bidirectional typed-JSON instruction protocol all working.

## Why
Phase 1 is the composition substrate — the foundational layer that lets the planner (Phase 2) produce typed-JSON layout trees that the WC shell renders using the host's atomic design system. Without a working composition loop, all higher phases are blocked.

## Phase 1 gate
End-to-end composed artifact renders from a hand-crafted layout-tree input, with the renderer walking a `LayoutTree` → DOM, capturing user interactions, and emitting typed `InstructionEnvelope`s back to the runtime.

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

### Slice 1.2 — WC shell side-panel + atomic component registry *(backlog)*
- `<saas-agent />` custom element upgraded with side-panel render mode
- Atomic UI Components registry: schema, storage, hot-reload
- WC-wrap default renderer wired to real DOM

### Slice 1.3 — Theme tokens registry *(backlog)*
- DTCG canonical schema
- Style Dictionary importer
- CSS variable fallback emission

### Slice 1.4 — Live UI Composer *(backlog)*
- Haiku + cached layout templates per intent
- Sonnet fallback for uncached intents
- SSE for streaming planner output (per ADR-038)
- WebSocket for bidirectional emit (per ADR-038)
- Native-renderer escape hatch primitive

## Child stories
- [STORY-024 — Slice 1.1: protocol package, stub composer, renderer validated](../stories/STORY-024-phase-1-slice-1-1-protocol.md)
