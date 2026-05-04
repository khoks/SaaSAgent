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

## Implemented optimizations (Phase 1.x, confirmed 2026-05-08)

### CompositionCache — LRU keyed by canonical intent fingerprint
**Source:** Phase 1.3 implementation (conversation 2026-05-08); design rationale in ADR-012.

The application-level cache sits in front of every HaikuComposer call. Key = canonical intent fingerprint derived from conversation context; value = typed-JSON `ComposedLayout` (the full composed layout tree). Cache hit returns immediately with a fresh `composeCycleId` — no LLM call. Invalidation triggers: design-system version change (any registered component version bump), theme token change, Feature/Service doc edit.

This is the primary cost lever for common e-commerce flows (product comparison, cart review, returns, recommendations) which repeat across sessions and users.

### Anthropic prompt cache — stable system prefix (cache_control: ephemeral)
**Source:** Phase 1.3 implementation; ADR-012 cache design; Anthropic SDK min-cacheable-prefix note.

The HaikuComposer sends a `SystemBlock[]` payload where the stable prefix (atomic-component registry dump + theme token block) carries `cache_control: {type: "ephemeral"}`. This prefix is cached at the Anthropic API level across calls from the same process. **Minimum cacheable prefix on `claude-haiku-4-5` is 4096 tokens** — the prompt cache won't reliably hit until Phase 1.4+ when the component registry and theme token block fill out to that threshold. Design accounts for this: the cache_control annotation is present from Phase 1.3 so it activates automatically as the registry grows.

### SSE chunked-write compatibility
**Source:** Phase 1.3.1 smoke-test finding (conversation 2026-05-08).

PowerShell's `HttpWebRequest` (and related Invoke-WebRequest patterns) buffers chunked SSE writes and does not surface individual events in real time. This is a client-side issue, not a runtime bug. The runtime's SSE implementation is correct. To test SSE outside a browser, use the `eventsource` npm package (same package used in integration tests) — not raw PowerShell HTTP.

### Windows ANTHROPIC_API_KEY injection for spawned subprocesses
**Source:** Phase 1.3.1 debug session (conversation 2026-05-08).

When Claude Code is launched before a machine-level env var is set (or when the var is set only in an interactive shell), the env var does not propagate to subprocesses spawned by Claude Code's Bash tool. Workaround in `launch.json` wrapper scripts: read the key from the Windows machine env explicitly via a Node.js wrapper that calls `process.env` at startup time. Node's ESM loader on Windows also requires `file://` URL notation when importing local modules from a wrapper script (not a relative path).

> The `extract-insights` skill appends entries as conversations surface them.
