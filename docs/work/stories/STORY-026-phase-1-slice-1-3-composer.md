# STORY-026 — Slice 1.3: real Composer LLM call — HaikuComposer + ModelProvider abstraction

- **Status:** done
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Done at:** 2026-05-03
- **Parent epic:** [EPIC-008 — Phase 1 Composition](../epics/EPIC-008-phase-1-composition.md)

## What was built

Real Anthropic API integration behind a provider-abstraction interface, completing the live composer that the Phase 1 gate requires.

### ModelProvider abstraction
- `ModelProvider` interface with `AnthropicProvider` (real) + `MockProvider` (test) implementations.
- Swapping to Bedrock / Vertex / Azure requires one new class; confirmed by ADR-007.
- Provider selected via `ANTHROPIC_API_KEY` presence in env; falls back to mock.

### HaikuComposer pipeline
1. Canonical-intent cache lookup (`CompositionCache`) — returns cached layout with fresh `composeCycleId` on hit.
2. **`claude-haiku-4-5`** call with cacheable `SystemBlock[]` (cache_control on stable system prefix per ADR-012).
3. `extractFirstJsonObject` — strips markdown fences / surrounding prose.
4. `Zod.safeParse` against `ComposedLayout` schema → cache + return on success; retry once on fail.
5. Sonnet fallback path if Haiku repeatedly fails.

### Prompt caching
- Two-layer caching: `CompositionCache` (in-process) + Anthropic prompt cache (server-side).
- Stable system-prompt prefix marked `cache_control: ephemeral`; dynamic intent appended after.

### Tests
- 42 tests passing across 5 packages (added: 5 AnthropicProvider, 5 HaikuComposer, 7 parse, 4 cache, 3 transport).
- `BadRequestError` wrapping verified via mock.

## Commit
`aed268f` — build(phase-1.3): real Anthropic Composer — HaikuComposer + provider abstraction + Zod-validated JSON + cache (19 files, 1118 insertions)

## Notes
- Schema loose by design (ADR-039, confirmed by Rahul): recursive `LayoutNode.children` prevents strict Zod inference; schema kept structurally permissive, runtime-validated at the boundary.
- `ANTHROPIC_API_KEY` set via env var; live smoke test confirmed working from user's terminal where key is in scope.
