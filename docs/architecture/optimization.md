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

## Confirmed optimizations from Phase 2 build (2026-05-06)

### Two-layer composition cache (ADR-012)
- **Layer 1 — Application CompositionCache**: LRU keyed by canonical-intent fingerprint. Stores typed-JSON `ComposedLayout` directly. Invalidated on design-system version change, theme token change, or Feature/Service doc edit. Returns with a fresh `composeCycleId` on hit — avoids model invocation entirely for repeat intents.
- **Layer 2 — Anthropic prompt cache**: `cache_control: {type: "ephemeral"}` on the stable system-block prefix (atomic-component registry + theme tokens). Min prefix = 4096 tokens; effective once Phase 1.4 fills the registry. Reduces per-call prompt-token cost ~90% on cache-hit turns.

### Token-bucket rate limiter at transport ingress (ADR-042)
Limits per-IP request rate before any planner work begins — cheapest possible cost gate. Configurable requests/window/burst via `SAAS_AGENT_RATE_LIMIT_RPM` env var. Complements (does not replace) per-user quota accounting (ADR-019, ClickHouse-backed).

### Implicit re-ask signal as a zero-cost eval feedback path (ADR-040)
Re-ask timing inference adds no latency, no model call, no UI widget — the negative eval signal is computed from a timestamp delta already tracked in WS session state. Avoids the "explicit-label-only" bottleneck that makes most eval pipelines data-starved at low traffic volumes.
