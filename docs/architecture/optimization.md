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

> The `extract-insights` skill appends entries as conversations surface them.

## Proven optimizations (Phase 1.x — validated 2026-05-04)

### Two-tier caching for `HaikuComposer` (Phase 1.3, operational from Phase 1.4)

Two cache layers, both load-bearing — neither alone is sufficient:

**Layer 1 — Application-level `CompositionCache` (LRU by canonical intent fingerprint)**
- On hit: returns a cached `ComposedLayout` directly, **bypassing the Anthropic API call entirely**. Zero-cost composition for recurring intents (e.g., "show product comparison").
- Keyed by a canonical intent fingerprint (normalized from the user's turn).
- Invalidation triggers: component registry version change, theme token change, Feature/Service doc edit.
- Lives in-process; bounded size (LRU eviction).

**Layer 2 — Anthropic API-level prompt cache (`cache_control: {type: "ephemeral"}` on `SystemBlock[]`)**
- The stable prefix (component registry + theme tokens) is identical across all composer calls for the same deployment state → Anthropic caches it server-side after the first call.
- **Min cacheable prefix on Haiku 4.5 is 4096 tokens** — won't hit until the component registry and theme tokens accumulate enough content (estimated: ~20–40 real registered components + a full token set).
- Design for it from Phase 1.3; expect real cache hits from mid-Phase 1.4 onward as the registry fills.
- When the cache prefix changes (registry PUT / theme PUT), the next call misses and primes a new cache entry.

### Raw JSON + Zod validation for recursive `LayoutNode` (Phase 1.3)

Anthropic's structured-outputs surface (`output_config: {format: ...}`) does **not** support recursive schemas. `LayoutNode.children: LayoutNode[]` is recursive by design — so strict structured output cannot be used for the composer.

**Pattern used:**
1. System prompt steers the model toward valid `LayoutNode` JSON shape.
2. Zod schema validates the raw output at runtime.
3. On validation failure: retry (up to N attempts) before escalating to the Sonnet fallback.

Acceptable cost tradeoff. Revisit if Anthropic adds recursive-schema support to structured outputs.

### `StubComposer` as the dev/offline fallback (Phase 1.3)

When `ANTHROPIC_API_KEY` is absent from the runtime process's environment, the runtime automatically selects `StubComposer` (deterministic, instant, zero API cost). This enables full local development and CI without credentials.

**Key operational note:** the key must be in the **runtime process's** environment, not just the shell that launched Claude Code. On Windows, machine-level env vars set after Claude Code was launched are not inherited by Claude Code's spawned subprocesses. Solution: inject the key explicitly via a wrapper script (`scripts/launch-with-env.mjs`) that reads from the Windows machine env and passes it to the runtime process.

### `ErrorEnvelope` + SSE `composer-error` events (Phase 1.3.1)

When the composer fails (both `HaikuComposer` and `SonnetFallbackComposer` exhausted), the runtime emits a typed SSE `event: composer-error` frame carrying an `ErrorEnvelope` (code, message, details). The shell's `onServerError` callback receives it and can render a graceful error state instead of silently timing out.

**Why this matters for latency perception:** without this, a failed compose causes the shell to wait for the 30-second SSE connection timeout before surfacing anything to the user. With `composer-error` events, the shell shows an error state within milliseconds of the composer failure.
