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

## Implemented cost / latency optimizations

### [2026-05-03] Two-layer composition caching (Phase 1.3)

The UI Composer pipeline (HaikuComposer) has two independent caching layers, both implemented and load-bearing:

| Layer | Mechanism | Key | What's cached | Invalidation |
|---|---|---|---|---|
| **CompositionCache** (app-level) | LRU in-process cache | Canonical intent fingerprint | Full `ComposedLayout` typed-JSON — no LLM call on cache hit | Design-system version change, theme token change, Feature/Service doc edit |
| **Anthropic prompt cache** (API-level) | `cache_control: {type: "ephemeral"}` on stable system prefix | Anthropic internal | Atomic-component registry + theme tokens prefix (~4K tokens min to activate) | Anthropic TTL (5 min); will activate once Phase 1.4 fills the registry |

**Cost impact:** cache hit on a recurring intent (e.g., "show product comparison") costs 0 LLM tokens (CompositionCache) or ~10% of a cold-start call (Anthropic prompt cache hit). Dominant savings come from CompositionCache for high-frequency intents; Anthropic prompt cache reduces cost on cold-start Haiku calls once the registry prefix is large enough.

**Source:** ADR-012 refinement 2026-05-03; Phase 1.3 implementation commit aed268f.

## Open questions
- Where does the orchestrator run physically (edge / region / origin)?
- How aggressively do we cache plans for similar intents? *(partially answered — see CompositionCache above; planner-level plan caching is still open)*
- How do we prevent a runaway proactive engine from blowing the cost budget?
- Per-tenant cost caps + circuit breakers — design needed.
