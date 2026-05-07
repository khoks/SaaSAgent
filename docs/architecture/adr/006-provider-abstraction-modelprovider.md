# ADR-006: Provider abstraction (ModelProvider)

**Status:** accepted
**Decision date:** 2026-04-20

## Context

We chose Anthropic for v0 (Sonnet + Haiku, cache-friendly + tool_use API +
structured output). But:

- Some tenants are AWS-Bedrock-only by procurement.
- Some are Azure-OpenAI-only.
- Some run their own Llama / Mistral / Qwen via vLLM.
- Future model-providers may cost less or perform better.

If composer + planner code calls `Anthropic.messages.create()` directly,
every change ripples through the codebase.

## Decision

**A thin `ModelProvider` interface sits between every model-using component
and the actual SDK.** The interface exposes:

```ts
generate(request: GenerateRequest): Promise<GenerateResponse>;
```

`GenerateRequest` and `GenerateResponse` describe the lowest-common-denominator
of frontier-model APIs: messages, system prompt with optional cache marks,
tools, tool_choice, structured content blocks.

`AnthropicProvider` is the v0 default. Future `BedrockProvider`,
`OpenAIProvider`, `VertexProvider` slot in via constructor injection — no
caller changes.

## Consequences

**Pro:**
- Composer + planner code is provider-neutral.
- Tests use `MockProvider` that returns canned responses.
- Tenants can swap providers via `RuntimeConfig.composer` / `planner` choice
  + custom provider injection.

**Con:**
- Interface is locked to lowest-common-denominator features. Provider-specific
  niceties (e.g. Anthropic's prompt cache API) sit behind opt-in flags
  (`SystemBlock.cache: true`).
- Some providers don't support tool_use natively — we'll need to fall back
  to JSON-schema prompting for those.

## Implementation

- `packages/runtime/src/model/types.ts` — interface + types.
- `packages/runtime/src/model/anthropic.ts` — v0 implementation.
- `packages/runtime/src/model/mock.ts` — test double.
