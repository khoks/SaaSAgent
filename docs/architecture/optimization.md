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

## Proactive engine: confidence model + attention budget (Batch 3, 2026-04-28 — pending Rahul confirmation)

### Confidence model (trigger decision)

| Approach | Status |
|---|---|
| **Multi-signal scoring** (planner confidence + memory match + workflow continuity + DOM-state relevance + time-since-last-interaction) | **Recommended for MVP** — more robust than single threshold despite tuning overhead; bootstrap with hand-tuned weights from e-commerce design partner |
| **Learned trigger model** (small model trained on accept/dismiss signals) | **Recommended for v1** — cold-start problem requires feedback history built during MVP phase; links naturally to the unified active+deduced feedback substrate |

### Attention budget (gating policy)

| Approach | Status |
|---|---|
| **Hard cap only** (host-configurable; proposed MVP default: max 2 unprompted per session, max 5 per day) | **Recommended for MVP** — simple, predictable, acceptable for e-commerce demo |
| **Token-bucket replenishment** (replenish over time, allow cadenced bursts) | Considered; deferred to v1 |
| **Per-user adaptation** (learn each user's optimal interruption cadence from accept/dismiss history) | Considered; deferred to v1 |
| **Combined: cap + bucket + per-user adaptation** | **Recommended for v1** — per-user adaptation closes the loop with the unified active+deduced feedback substrate: virtuous-circle where the agent learns each user's tolerance over time |

**Virtuous-circle note:** at v1, the proactive engine's per-user adaptive budget reads directly from the unified feedback substrate (accept/dismiss signals), creating a self-improving loop that is architecturally unique to this platform.

**Source:** Q3.6 discussion, session 2026-04-28.

## Open questions
- Where does the orchestrator run physically (edge / region / origin)?
- How aggressively do we cache plans for similar intents?
- How do we prevent a runaway proactive engine from blowing the cost budget?
- Per-tenant cost caps + circuit breakers — design needed.
