# STORY-008 — Protocol typed-JSON schema package

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User story

As a platform engineer, I need a shared typed-JSON contract package so that the runtime, renderer, and client can all parse and emit the same LayoutTree, InstructionEnvelope, and DataSource types without runtime schema drift.

## Done when

- `@saasagent/protocol` package published in monorepo.
- Exports: `LayoutNode`, `ComposedLayout`, `DataSource` (literal/memory/host-api/sub-agent/computed), `InstructionEnvelope`, `InstructionAck` (causality-tracked via `composeCycleId`), `PROTOCOL_VERSION`.
- Renderer walks LayoutTree → DOM in JSDOM test.
- 18 tests passing across 5 packages.

## Completion notes

Committed 5a4c97c (Phase 1.1). Schemas intentionally kept loose per Rahul's direction (Q6.3 answer confirmed SSE+WS transport before the protocol was finalized).
