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

## Non-functional requirements (NFRs confirmed in INIT-002)

- **NFR-DX-001:** A domain dev can author a new `.feature.md` and see it reflected in live planner behaviour in under 5 minutes. Implies hot-reload for the Feature/Service registry without full platform restart.
- **NFR-DEPLOY-001:** Helm chart installs cleanly on a fresh k8s cluster (kind / minikube / production-like) in under 30 minutes from zero.
- **NFR-DEPLOY-002:** Docker Compose stack `up`s on a developer laptop in under 10 minutes from zero.
- **NFR-ONBOARD-001:** A new contributor goes from `git clone` to running the e-commerce demo in under 60 minutes (getting-started guide requirement).

## Storage tier upgrade path

MVP eval storage uses **Postgres** (co-located with the raw interaction log — no extra store required at MVP). Upgrades to **ClickHouse** at v1 once per-skill / per-sub-agent eval volume justifies a dedicated OLAP store. This defers a ClickHouse dependency from MVP and keeps the MVP ops surface at 3 systems (PG + Qdrant + Redpanda).

**Source:** INIT-002 scope-in (Eval section): "Bundled backend (storage on Postgres at MVP, scoring runners, regression detection)."

## Real-time transport (WC shell ↔ runtime) — provisional default

Batch 6 open question (Q6.3). Provisional default suggested in INIT-002:
- **SSE** for streaming planner/composer output to the WC shell (one-directional server→client token stream).
- **WebSocket** for bidirectional interaction emit (user action → typed-JSON instruction → runtime re-plan).

Sensible split: SSE is lighter for the high-frequency render stream; WebSocket handles low-frequency but bidirectional control messages. Final decision pending Batch 6 confirmation.

**Source:** INIT-002 open dependencies (Q6.3): "Sensible MVP default: SSE for streaming planner output to the shell + WebSocket for bidirectional interaction emit."

## Sub-agent federation performance notes

- gRPC HTTP/2 multiplexing allows concurrent sub-agent calls from the planner in a single connection pool — reduces connection overhead during parallel sub-agent fan-out.
- LightGBM churn model inference at < 1ms per prediction (source: ADR-031). Safe to invoke synchronously in the planner's recommendation path without async overhead.

## Open questions
- Where does the orchestrator run physically (edge / region / origin)?
- How aggressively do we cache plans for similar intents?
- How do we prevent a runaway proactive engine from blowing the cost budget?
- Per-tenant cost caps + circuit breakers — design needed.
- Q6.1: Cross-store consistency failure-recovery semantics (Postgres + Qdrant + Redpanda — partial write failure modes).
- Q6.4: Adapters registry transport — how host event bus → platform Redpanda topic (webhook vs. direct integration vs. SDK adapter library).
