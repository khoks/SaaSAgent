# INIT-001 — Groom platform vision and requirements

- **Status:** in-progress
- **Created:** 2026-04-26
- **Last updated:** 2026-04-26
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
- (TBD as grooming proceeds)

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

### Batch 3 — open
- **Q3.1 Compilation timing for Feature/Service NL→JSON** — registration-time vs. runtime (follow-up to ADR-011).
- **Q3.2 MVP framework scope** — React + WC only at MVP, defer Vue/Svelte/Angular to v1.5? (follow-up to ADR-010).
- **Q3.3 Stream processing for derivation pipeline** — in-process / Redpanda / Kafka / Temporal.
- **Q3.4 Voice-of-Customer surface for dev team** — dashboard / webhook / Slack-or-email digest / auto-PR / multi.
- **Q3.5 Mobile embedding strategy** — React Native / native SDKs / WebView bridge.
- **Q3.6 Proactive engine confidence + attention-budget model** — heuristics, signals, gating policies.

### Batch 4+ — deferred
- Theme/branding tokens schema (Style Dictionary / Spectrum / custom).
- Pricing model (license / per-seat / capacity).
- Distribution / packaging (Docker / Helm / standalone).
- Sub-agent isolation (process / iframe / VM / none).
- Eventing model for DOM observation.
- Eval target metrics + scoring approach.
- Embedding model choice.
- Cross-store consistency failure-recovery.
- Federated cross-enterprise learning (v2).
