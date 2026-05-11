# STORY-010 — HaikuComposer with Anthropic provider

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User story

As a platform engineer, I need the runtime to call `claude-haiku-4-5` via the Anthropic SDK to compose LayoutTree JSON from user intent, with a ModelProvider abstraction so swapping to Bedrock/Vertex later is a single new class implementation.

## Done when

- `AnthropicProvider` + `MockProvider` implement a common `ModelProvider` interface.
- `HaikuComposer` pipeline: canonical-intent cache lookup → `claude-haiku-4-5` call with cacheable `SystemBlock[]` → Zod runtime validation → ComposedLayout.
- `ErrorEnvelope` type in protocol; runtime emits `composer-error` SSE event on failure; client dispatches `onServerError`.
- 47 tests passing (42 core + 5 error-propagation).
- Live smoke with real Anthropic API: 2.5 s end-to-end response via `pnpm smoke:server`.

## Completion notes

Phase 1.3 committed aed268f (42 tests, 19 files, 1118 insertions). Phase 1.3.1 committed d39e3d4 (47 tests, error propagation, 13 files, 421 insertions). SDK 0.65 breaking change workaround applied (`BadRequestError` constructor). Windows ESM `file://` URL fix applied for env-injection wrapper.
