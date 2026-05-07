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

## Implemented optimizations (Phase 2–5, 2026-05-06)

### Planner prompt caching (ADR-012)
The stable system prefix (atomic component registry + theme tokens + feature docs) is submitted with `cache_control: {type: "ephemeral"}` on the Anthropic API. Cache hits appear on repeated planner invocations where the registry has not changed. Min cacheable prefix on Haiku 4.5 is 4096 tokens — cache hits materialise once the registry fills out.

### CompositionCache (ADR-012)
LRU cache keyed by canonical intent fingerprint. Stores typed-JSON `ComposedLayout` directly. Invalidation triggers: design-system version change, theme token change, Feature/Service doc edit. Allows the Haiku composer to skip the LLM call entirely on repeated identical intents.

### DOM event ring-buffer per WS (ADR-022)
MutationObserver + IntersectionObserver events do NOT flow to the planner synchronously. Each WS connection maintains a bounded ring buffer. The planner queries the buffer on demand. This prevents high-frequency DOM mutations from flooding the LLM context window and burning tokens.

### Eval-feedback WS bypass (ADR-040)
`eval-feedback` envelopes are intercepted at the WS layer before reaching the planner. This keeps the eval capture path low-latency and isolated from the planning hot path.

### Token-bucket rate limiting (2026-05-06)
Runtime ships a configurable token-bucket rate limiter. Configurable: window size and burst limit. Applied per client IP at the HTTP/WS layer before any planning work begins. Prevents cost runaway from misbehaving or adversarial clients.
