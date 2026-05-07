# ADR-005: Haiku composer with Sonnet fallback

**Status:** accepted
**Decision date:** 2026-04-19

## Context

The composer turns a planner-supplied intent into a typed-JSON layout the
shell renders. Two model choices on the table:

1. **Always use Sonnet** — best quality, expensive (~5x Haiku).
2. **Always use Haiku** — cheap, but occasionally produces invalid JSON
   for novel intents.

Composition is high-volume — every user interaction triggers it. Cost
dominates if we Sonnet-everything.

## Decision

**Default to claude-haiku-4-5 with a Sonnet fallback path:**

1. Call Haiku with the system prompt + user intent.
2. If the response parses as a valid `LayoutNode`, return it.
3. If parsing fails, call `claude-sonnet-4-6` with adaptive thinking enabled,
   appending the failed Haiku output and an explicit retry instruction.
4. If Sonnet also fails, throw — the shell shows an `ErrorEnvelope`.

Both layers share the same system prompt (cacheable via Anthropic prompt
cache); only the Sonnet attempt adds a few hundred extra prompt tokens for
the retry hint.

## Consequences

**Pro:**
- ~95% of compositions stay on the cheap path.
- The 5% that hit Sonnet are still automatically resolved without ops
  intervention.
- Two-layer prompt cache: application-level CompositionCache by canonical
  intent + Anthropic prompt cache for the system block.

**Con:**
- Two model calls in the failure case (~doubles latency for that small
  fraction). Acceptable since "novel intent" cases benefit from Sonnet's
  better reasoning.
- Cache invalidation is coupled to `componentRegistry.version ::
  themeRegistry.version` — registry edits are rare so this is fine.

## Implementation

- `packages/runtime/src/composer/haiku.ts`
- `packages/runtime/src/composer/cache.ts` — bounded LRU keyed by
  `${componentsVersion}::${themeVersion}::${canonicalIntent}`.
