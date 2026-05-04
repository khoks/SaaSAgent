# STORY-024 — Slice 1.1: protocol package, stub composer, renderer validated

- **Status:** done
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Completed:** 2026-05-03
- **Parent epic:** [EPIC-008 — Phase 1 Composition](../epics/EPIC-008-phase-1-composition.md)

## Outcome
`@saasagent/protocol` package ships with the full typed-JSON wire contract. A stub UIComposer and layout renderer skeleton validate the bidirectional protocol loop end-to-end in JSDOM before any LLM or real transport is wired in. 18 tests passing across 5 packages.

## Why
Slice 1.1 de-risks the entire Phase 1 by validating the shape of the protocol and the renderer's ability to walk a layout tree, capture user events, and emit typed envelopes — all without external dependencies. This is the lowest-risk, highest-confidence slice of the composition substrate.

## What was completed

### `@saasagent/protocol` package (new)
- `version.ts` — `PROTOCOL_VERSION = '0.1.0'`
- `layout.ts` — `LayoutNode`, `ComposedLayout`, `DataSource` discriminated union (5 variants: literal / memory / host-api / sub-agent / computed), `EmitSpec`
- `instruction.ts` — `InstructionEnvelope` + `InstructionAck` with `composeCycleId` for causality tracking
- `theme.ts` — DTCG token types (Design Token Community Group canonical format per ADR-025)
- `atomic-component.ts` — `AtomicComponent` registry shape + `ComponentRegistry` map type

### Stub UIComposer (in `@saasagent/runtime`)
- Echo-mode: returns a minimal hard-coded `ComposedLayout` without any LLM call
- Validates that the runtime can produce a layout tree and hand it to the renderer

### Layout renderer skeleton (in `@saasagent/web-shell`)
- Walks a `LayoutTree` → JSDOM elements
- Subscribes to user interaction events (click)
- Emits typed `InstructionEnvelope`s back to the runtime stub
- Validates the full bidirectional loop without a real browser

### Test coverage
- 18 tests across 5 packages: `protocol`, `runtime`, `sdk-ts`, `web-shell`, `cli`
- Bidirectional loop test: composer emits layout tree → renderer walks to DOM → user click → typed envelope emitted → verified

## Commit
`5a4c97c build(phase-1.1): protocol package + stub composer + layout renderer — bidirectional loop validated end-to-end`

## Done when
- ✅ `@saasagent/protocol` package compiles with no errors.
- ✅ Stub UIComposer returns a valid `ComposedLayout`.
- ✅ Layout renderer walks a layout tree to DOM elements in JSDOM.
- ✅ Click event on rendered element emits a typed `InstructionEnvelope`.
- ✅ All 18 tests pass (`pnpm test` green).
- ✅ Bidirectional loop validated end-to-end.
