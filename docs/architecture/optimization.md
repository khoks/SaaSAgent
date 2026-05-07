# Optimization, Scaling & Infrastructure

> Living document. Auto-maintained by the `extract-insights` skill when conversations touch performance, scaling, infra, or cost optimization.

## Performance hot paths (anticipated)
- **First widget render** after user turn — perceived latency anchor.
- **DOM observation cost** — must not bog down host page.
- **Memory recall** — bounded latency for cross-session lookups.
- **Streaming token rate** — must keep up with model output.
- **Tool / sub-agent fan-out** — parallel execution where dependencies allow.

## Scaling axes (anticipated)
- **Tenants** — number of host enterprises on the platform.
- **Concurrent users per tenant** — peak simultaneous conversations.
- **Memory volume per user** — long-tail of cross-session history.
- **Registry size per tenant** — how many skills, sub-agents, tools, widgets, features.

## Cost levers (anticipated)
- Prompt caching (Anthropic).
- Model selection per task (Haiku for cheap routing, Sonnet for orchestration, Opus for hard reasoning).
- Memory retrieval bounded by relevance + recency.
- Widget protocol size (server-driven vs. shipped components).
- Speculative execution vs. confirm-first.

## Open questions
- Where does the orchestrator run physically (edge / region / origin)?
- How aggressively do we cache plans for similar intents?
- How do we prevent a runaway proactive engine from blowing the cost budget?
- Per-tenant cost caps + circuit breakers — design needed.

## Implemented optimizations (Phase 1.3, 2026-05-06)

### Anthropic prompt caching on stable HaikuComposer system blocks
- **What:** The `HaikuComposer` places `cache_control: {type: "ephemeral"}` on the stable prefix of its system message (`SystemBlock[]` — the layout schema, registry vocabulary, theme block). These blocks don't change between turns, so Anthropic caches the KV state for ~5 minutes; subsequent calls within the window skip re-computing the prompt prefix.
- **Impact:** Reduces per-turn input token cost for composition calls (the stable prefix is typically 500–1500 tokens depending on registry size and theme block). The dynamic suffix (conversation context, `toolResults`, feature hints) is always fresh. Particularly valuable for high-frequency sessions where the same registry is queried repeatedly.
- **Constraint:** Cache control is rendered in `tools → system → messages` order on the Anthropic API; the stable prefix must be placed first in the system array for the cache hit to be effective.
- **Source:** Phase 1.3 implementation, conversation 2026-05-06.

### CompositionCache — intent-keyed layout reuse before LLM call
- **What:** `CompositionCache` is an in-memory map from `canonicalIntent → ComposedLayout`. Before invoking Haiku, the composer hashes the intent string to a canonical form and checks the cache. On a hit, it returns the cached layout (with a fresh `composeCycleId`) without making an Anthropic API call.
- **Impact:** Zero LLM cost for recurring intents (e.g., repeated "show product comparison" requests in a session). Cache is per-runtime-instance and cleared on restart; no cross-session persistence in Phase 1.3.
- **Trade-off:** Cached layouts are stale if the component registry or theme changes between calls. Cache is invalidated on any registry PUT. `toolResults` in `ComposeContext` always bypass the cache (fetched data is session-specific and must be composed fresh).
- **Source:** Phase 1.3 implementation, conversation 2026-05-06 ("Canonical-intent cache lookup → return with fresh composeCycleId on hit").
