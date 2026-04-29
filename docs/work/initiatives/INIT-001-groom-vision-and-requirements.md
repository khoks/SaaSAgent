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

### Batch 4 — open
- **Q4.1 Platform-vendor pricing model** (host pays vendor) — license / per-seat / capacity / hybrid.
- **Q4.2 Distribution / packaging** — Docker Compose / Helm chart / standalone binary / installer / multi.
- **Q4.3 Sub-agent isolation** — process / iframe / VM / WASM / none.
- **Q4.4 Eventing model for DOM observation** — MutationObserver + IntersectionObserver + custom event channel.
- **Q4.5 Eval target metrics + scoring approach** — LLM-as-judge / heuristics / embedded eval models / hybrid.
- **Q4.6 Embedding model choice** — Anthropic embeddings / OSS (BGE/E5/nomic) / host-supplied.
- **Q4.7 Theme-tokens schema** — Style Dictionary / Spectrum tokens / CSS variables / custom DSL.
- **Q4.8 Customer Churn ML Model architecture** — GBT / neural / ensemble; cold-start strategy; explainability surface.
- **Q4.9 Cross-store consistency failure-recovery semantics**.
- **Q4.10 Federated cross-enterprise learning** — opt-in mechanism design (v2-scoped, but principles need establishing).
