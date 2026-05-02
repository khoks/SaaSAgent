# INIT-001 — Groom platform vision and requirements

- **Status:** in-progress
- **Created:** 2026-04-26
- **Last updated:** 2026-04-28
- **Outcome:** A sharp, written, agreed vision and requirements baseline that any future contributor (human or AI) can read and align on without further conversation with Rahul.

## Why
Without a groomed baseline, MVP scope will drift, and architectural decisions will lack traceable rationale.

## Done when
- PLOT.md, docs/vision.md complete and accepted.
- docs/requirements/{functional,non-functional,future-requirements}.md have all known requirements captured.
- docs/architecture/{overview,tech-stack,optimization}.md have at minimum: layer diagram, tech-stack candidates, optimization hot-paths.
- docs/decisions/decision-log.md has ADRs for the ≥10 most load-bearing decisions.
- docs/novel-ideas/ideas.md has all novel ideas surfaced so far.

## Child epics
- [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## Grooming questions

### Batch 1 — closed 2026-04-26
1. ✅ Design-partner vertical for MVP — **e-commerce** ([ADR-003](../../decisions/decision-log.md)).
2. ✅ Embed surface — **WC shell with multi-framework component registry** ([ADR-004](../../decisions/decision-log.md)).
3. ✅ UI rendering model — **runtime composition from host's atomic design system** ([ADR-005](../../decisions/decision-log.md)).
4. ✅ Deployment / multi-tenancy — **self-hosted only inside enterprise's ecosystem** ([ADR-006](../../decisions/decision-log.md)).
5. ✅ Agent runtime — **Claude Agent SDK behind thin internal interface** ([ADR-007](../../decisions/decision-log.md)).

### Batch 2 — closed 2026-04-26
6. ✅ **Memory store architecture** — polyglot (PG + Qdrant + ClickHouse + Neo4j), phased ([ADR-008](../../decisions/decision-log.md)). See [memory.md](../../architecture/memory.md). Q6 expanded scope substantially: workflow progress, customer interaction profile, SaaS service usage profile, SaaS domain profile, time-tiered summaries (session/day/week/month/year), intra-tenant problem-solution graph, eval (live + offline), agent self-telemetry, active + deduced feedback, voice-of-customer extraction.
7. ✅ **DS registration protocol** — hybrid (manual JSON + Storybook auto-extract + component-metadata extract + manual augmentation) ([ADR-009](../../decisions/decision-log.md)).
8. ✅ **Multi-framework rendering** — WC-wrap default + native-renderer escape hatch ([ADR-010](../../decisions/decision-log.md)). MVP framework scope sub-question still open.
10. ✅ **Feature/Service document format** — `.feature.md` (MD + YAML frontmatter + inline JSON) ([ADR-011](../../decisions/decision-log.md)). NL→JSON compilation-timing sub-question still open.
14. ✅ **UI Composer LLM step** — Haiku + cached templates + Sonnet fallback ([ADR-012](../../decisions/decision-log.md)).

### Batch 3 — closed 2026-04-28
- ✅ **Q3.1 Feature/Service consumption model** — no compilation; agent reads `.feature.md` directly as super-skill doc ([ADR-013](../../decisions/decision-log.md)). Substantive reframe of ADR-011's open sub-question.
- ✅ **Q3.2 MVP framework scope** — React + vanilla WC at MVP; Vue/Svelte/Angular at v1.5 ([ADR-015](../../decisions/decision-log.md)).
- ✅ **Q3.3 Stream processing** — Redpanda from MVP ([ADR-014](../../decisions/decision-log.md)).
- ✅ **Q3.4 Voice-of-Customer** — multi-surface configurable + **closed-loop reprocessing back into agent decision-making**; introduces a new first-class component (Customer Churn ML Model) ([ADR-016](../../decisions/decision-log.md)). High-novelty addition.
- ✅ **Q3.5 Mobile embedding** — WebView bridge with mobile-context-aware composition ([ADR-017](../../decisions/decision-log.md)).
- ✅ **Q3.6 Proactive engine** — multi-signal scoring + combined attention budget ([ADR-018](../../decisions/decision-log.md)) **+** end-user tier/quota system as a separate concern ([ADR-019](../../decisions/decision-log.md)).

### Batch 4 — closed 2026-05-01
- ✅ **Q4.1 Platform-vendor pricing** — open-core hybrid: free OSS + paid Enterprise subscription + paid Capacity tiers unlocking high-novelty features ([ADR-020](../../decisions/decision-log.md)).
- ✅ **Q4.3 Sub-agent execution model** — **REFRAME: federated independent runtimes** built by domain teams via SDK + boilerplate; NOT in-process isolated workers. Three-tier capability model crystallized: Tools / Skills / Sub-Agents ([ADR-021](../../decisions/decision-log.md)). High-novelty addition.
- ✅ **Q4.4 DOM observation eventing** — MO + IO + custom semantic event channel via separate **Adapters registry** (NEW first-class registry) ([ADR-022](../../decisions/decision-log.md)).
- ✅ **Q4.5 Eval** — hybrid scoring + **auto-generated per-capability eval from registry metadata** + bundled backend + dashboard ([ADR-023](../../decisions/decision-log.md)). High-novelty addition.
- ✅ **Q4.6 Embedding model** — host-supplied via adapter (required for production); bundled `nomic-embed-text-v1.5` for dev/demo ([ADR-024](../../decisions/decision-log.md)).
- ✅ **Q4.7 Theme/branding** — DTCG canonical + Style Dictionary importer + CSS variable fallback ([ADR-025](../../decisions/decision-log.md)).

### Batch 5 — open
- **Q5.1 Distribution / packaging** — Docker Compose / Helm chart / standalone binary / installer / multi.
- **Q5.2 Sub-Agent SDK languages at MVP** — TS only / TS+Python / TS+Python+Go.
- **Q5.3 Sub-Agent federation protocol** — gRPC / HTTP / WebSocket / SSE / hybrid.
- **Q5.4 Sub-Agent discovery + authn/authz** — pull (registry endpoint) vs. push (self-register); mTLS / JWT / both.
- **Q5.5 Eval dashboard tech** — bundled SPA / Grafana / custom.
- **Q5.6 Customer Churn ML Model architecture** — GBT / neural / ensemble; cold-start; explainability.
- **Q5.7 Cross-store consistency failure-recovery semantics**.
- **Q5.8 Federated cross-enterprise learning (v2)** — opt-in mechanism design.
- **Q5.9 Real-time transport** — WebSocket / SSE / WebRTC (voice) / hybrid.
- **Q5.10 Adapters registry transport** — how host event bus → platform Redpanda topic.
