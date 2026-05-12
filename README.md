# SaaS Agent Platform

A universal, embeddable agentic harness for any SaaS enterprise.

> **Status (2026-05-12):** MVP build complete — Phases 0–9 land per INIT-003.
> 38 ADRs accepted, 5 invention disclosures drafted, polyglot data plane (PG +
> Qdrant + Redpanda + ClickHouse + Neo4j), three-tier capability model
> (Skills / Tools / Sub-Agents), per-capability eval dashboard, tier/quota
> enforcement, proactive engine with attention-budget cap.
> Read [PLOT.md](PLOT.md) for the one-page narrative.

## Quick start — under 10 minutes

```bash
# Prereqs: Node 20+, pnpm 9+
pnpm install                                          # install workspace deps
pnpm build                                            # build all packages

# Terminal 1: start the Expedia reference integration (5 skills + 1 sub-agent)
node apps/demo-expedia/server/start-runtime.mjs       # :8080
# Terminal 2: trip-planner sub-agent
node apps/demo-expedia/server/start-trip-planner.mjs  # :8082
# Terminal 3: host page (mock Expedia.com)
pnpm --filter @saasagent/demo-expedia dev             # :5175

# Then open:
# • http://localhost:5175/   — the embedded agent in a host site
# • http://localhost:8080/dashboard — auto-generated eval metrics per capability
# • http://localhost:8080/health    — runtime config + mode
```

Without an `ANTHROPIC_API_KEY` the runtime falls back to `StubPlanner` —
the UI shell still loads, DOM observation flows, eval signals are recorded,
the quota banner displays, and the proactive engine fires. To exercise
skills directly without a planner:

```bash
curl -X POST -H 'content-type: application/json' \
     -d '{"origin":"SFO","destination":"NRT","cabin":"economy"}' \
     http://localhost:8080/executor/skill/expedia.search-flights
```

`/health` includes a `devHint` block with the full direct-dispatch surface
when in stub mode.

## Architecture at a glance

```
Host page (any SaaS web app)
   │
   ├── <saas-agent runtime="http://localhost:8080" mode="side-panel">
   │      • SSE: server → shell layouts (composeCycleId on every layout)
   │      • WS:  shell → server emits (envelopes echo cycleId — P-001)
   │      • DOM observer: MutationObserver + IntersectionObserver +
   │        document-level `saasagent:event` semantic relay (ADR-022)
   │
   └── Runtime (single Node process)
          ├── Planner (StubPlanner / SonnetPlanner — claude-sonnet-4-6)
          ├── Composer (StubComposer / HaikuComposer + Sonnet fallback)
          ├── Three-tier registries: Skills / Tools / Sub-Agents
          ├── Polyglot memory: PG / Qdrant / ClickHouse / Neo4j (per ADR-008)
          ├── EvalProvider (user signals) + ChurnRiskCalculator
          ├── CapabilityEvalRunner (per-skill quality, dashboard at /dashboard)
          ├── TierProvider (per-user request quotas, "X remaining" banner)
          ├── ProactiveEngine (multi-signal scoring + attention budget)
          └── Sub-agent federation: POST /federate (symmetric — every
              runtime can both call and be called)
```

## Building a host integration

`apps/demo-expedia/` is the reference. Three files, ~30 LoC of glue:

1. **`server/start-runtime.mjs`** — construct a `Runtime` with your skills,
   tools, sub-agents, tier definitions, proactive config. ~30 LoC.
2. **`server/start-trip-planner.mjs`** — a federated specialist sub-agent
   via `@saasagent/sdk` `defineSubAgent`.
3. **`index.html` + `src/main.ts`** — your existing app, plus an embedded
   `<saas-agent>` Web Component and `saasagent:event` custom events on
   semantic moments (cart-item-added, flight-shortlisted, etc.).

See [apps/demo-expedia/](apps/demo-expedia/) — every line is annotated.

## Documentation map

| Area | Path |
|---|---|
| Vision (one-pager) | [PLOT.md](PLOT.md) |
| Vision (long form) | [docs/vision.md](docs/vision.md) |
| Architecture overview | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Tech stack choices | [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) |
| Performance / scaling | [docs/architecture/optimization.md](docs/architecture/optimization.md) |
| Non-functional requirements | [docs/requirements/non-functional.md](docs/requirements/non-functional.md) |
| Decision log (38 ADRs) | [docs/architecture/adr/](docs/architecture/adr/) |
| Patents track (5 inventions) | [docs/patents/](docs/patents/) |
| Work tracking | [docs/work/](docs/work/) |
| OSS readiness + getting-started | [docs/getting-started.md](docs/getting-started.md) |
| NFR validation | [docs/operations/nfr-validation.md](docs/operations/nfr-validation.md) |

## Patents and the Apache 2.0 grant

This project is licensed under [Apache License 2.0](LICENSE). §3 of the
license grants every user of the code a royalty-free patent license under
the standard terms. See [NOTICE](NOTICE) for additional context and
[docs/patents/](docs/patents/) for the invention disclosures and filing
strategy (ADR-035).

## Automation

Two project-local skills run after each Claude Code conversation:

- **`extract-insights`** — scans the conversation, updates docs.
- **`work-management`** — maintains the initiative → epic → story → task
  hierarchy under `docs/work/`.

Both are wired via the `Stop` hook in `.claude/settings.json`.
