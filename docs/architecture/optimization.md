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

## Discovered optimizations (Phase 1–2 implementation)

### Anthropic prompt cache minimum token threshold (Phase 1.3)
The Anthropic ephemeral `cache_control` on Haiku 4.5 requires the cacheable prefix to reach **4096 tokens** before a cache hit is possible. The stable system prefix (atomic component registry + theme tokens) must be filled out to this threshold to benefit. During Phase 1.3 the registry was sparse — cache hits will not occur until the registry is populated to production scale. Design for caching from the start; do not expect cache savings during early dev with an empty registry.

### SSE chunked-transfer compatibility: use an SSE-aware client in all smoke tests (Phase 1.3.1)
PowerShell's `HttpWebRequest` (and similar raw HTTP clients) buffers chunked SSE writes from Node's `http.ServerResponse.write()` — the client sees silence until the response closes. The `eventsource` npm package handles chunked SSE correctly. **All smoke tests and integration tests that consume the SSE endpoint must use an SSE-aware client** (the `eventsource` package or the browser's native `EventSource`). Tests that use raw HTTP clients against SSE will appear to hang silently without errors.
