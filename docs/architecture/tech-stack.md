# Tech Stack

> Living document. Auto-maintained by the `extract-insights` skill.

## Status: Decisions in progress.

| Layer | Candidate options | Decision | ADR |
|---|---|---|---|
| Agent runtime language | TypeScript, Python, Rust, Go | TBD (TS leaning, given WC shell + Claude Agent SDK ergonomics) | — |
| Foundation model provider | Anthropic (default), provider abstraction | **Anthropic** at v0, behind a thin internal interface | [ADR-007](../decisions/decision-log.md) |
| Agent framework | Claude Agent SDK, LangGraph, bespoke | **Claude Agent SDK** at substrate; bespoke orchestrator/planner/thinker/composer on top | [ADR-007](../decisions/decision-log.md) |
| Planner model | Sonnet, Opus, Haiku | **Sonnet** (default planner) | derivative of [ADR-012](../decisions/decision-log.md) |
| UI Composer model | Sonnet, Haiku, fine-tuned | **Haiku composer + cached layout templates per intent + Sonnet fallback for novel intents** | [ADR-012](../decisions/decision-log.md) |
| Embed surface | Web Component, React SDK, iframe, all | **Web Component shell** with multi-framework component registry inside | [ADR-004](../decisions/decision-log.md) |
| UI rendering model | SDUI catalog, shipped components, generative UI, **DS composition** | **Runtime composition from host's atomic design system** | [ADR-005](../decisions/decision-log.md) |
| Component registry framework support | React only / multi-framework | **React + vanilla WC at MVP**; Vue/Svelte/Angular at v1.5 (multi-framework adapter ready) | [ADR-004](../decisions/decision-log.md), [ADR-015](../decisions/decision-log.md) |
| Multi-framework runtime | Module Federation, per-framework adapters, custom-element wrappers, hybrid | **WC-wrap by default + native-renderer escape hatch** for performance-critical primitives | [ADR-010](../decisions/decision-log.md) |
| DS registration intake | Manual / Storybook auto-extract / metadata extract / hybrid | **Hybrid: all three paths + manual augmentation layer** | [ADR-009](../decisions/decision-log.md) |
| Theme/branding tokens | Style Dictionary, Spectrum, CSS variables, DTCG, custom DSL | **W3C Design Tokens (DTCG) canonical schema + Style Dictionary importer + CSS variable fallback**; Figma Tokens import as future | [ADR-025](../decisions/decision-log.md) |
| Feature/Service doc format | YAML / JSON / Markdown+frontmatter+inline-JSON | **`.feature.md` — Markdown + YAML frontmatter + inline JSON** | [ADR-011](../decisions/decision-log.md) |
| Feature/Service consumption model | Compile to JSON / read directly | **Read directly as super-skill doc — no compilation step** | [ADR-013](../decisions/decision-log.md) |
| Memory: raw + workflow + active feedback + profiles + tier definitions | Postgres / DynamoDB / SQLite | **Postgres (append-only raw log + structured derived)** | [ADR-008](../decisions/decision-log.md) |
| Memory: semantic recall (vector) | pgvector, Pinecone, Weaviate, **Qdrant**, Chroma | **Qdrant** (default; pluggable) | [ADR-008](../decisions/decision-log.md) |
| Memory: time-tiered summaries + eval + telemetry + VoC analytics + quotas | TimescaleDB, **ClickHouse**, Druid | **ClickHouse** (v1; pluggable) | [ADR-008](../decisions/decision-log.md), [ADR-019](../decisions/decision-log.md) |
| Memory: problem-solution graph + VoC relations + churn model state | **Neo4j**, ArangoDB, Dgraph, Memgraph | **Neo4j** (v1; pluggable) | [ADR-008](../decisions/decision-log.md), [ADR-016](../decisions/decision-log.md) |
| Stream processing for derivation pipeline | In-process, **Redpanda**, Kafka, Temporal | **Redpanda from MVP** | [ADR-014](../decisions/decision-log.md) |
| Customer Churn ML Model | Bundled default + pluggable adapter | **Per-tenant default model bundled (architecture TBD: GBT / neural / ensemble); adapter for host's existing churn model** | [ADR-016](../decisions/decision-log.md) |
| Voice-of-Customer surfaces | Single / multi configurable | **All-of-above configurable: dashboard + webhook + Slack-or-email digest + auto-PR; default-on for MVP demo: weekly Slack digest + embedded dashboard** | [ADR-016](../decisions/decision-log.md) |
| Embedding model | Anthropic, OSS, host-supplied | **Host-supplied via adapter (required for production)**; bundled `nomic-embed-text-v1.5` for development/demo | [ADR-024](../decisions/decision-log.md) |
| Event bus integration | Kafka, NATS, webhooks, host-defined adapter | Adapter pattern (host-defined) | derivative of [ADR-006](../decisions/decision-log.md) |
| DOM observation eventing | MutationObserver, +IntersectionObserver, +custom semantic events | **MO + IO + custom semantic event channel from host via Adapters registry**; MO+IO-only fallback when host doesn't emit custom events | [ADR-022](../decisions/decision-log.md) |
| Mobile embedding | React Native, native SDKs, **WebView bridge** | **WebView bridge with mobile-context-aware composition** at MVP; native SDKs at v1.5 | [ADR-017](../decisions/decision-log.md) |
| Multi-tenancy model | Pool, silo, hybrid | **Single-tenant (one deployment per enterprise)** | derivative of [ADR-006](../decisions/decision-log.md) |
| Real-time transport (shell ↔ runtime) | WebSocket, SSE, WebRTC, hybrid | **SSE for streaming planner output to shell + WebSocket for bidirectional instruction emit**; WebRTC reserved for voice (Phase 5) | [ADR-038](../decisions/decision-log.md) |
| Observability stack | OpenTelemetry, custom, hosted | OpenTelemetry (host-controlled exporters) | derivative of [ADR-006](../decisions/decision-log.md) |
| Auth model | Bring-your-own (host SSO), platform-issued tokens | **Bring-your-own (host SSO)** | derivative of [ADR-006](../decisions/decision-log.md) |
| Sub-agent execution model | In-process / process-isolated / WASM / VM / **federated runtimes** | **Sub-agents are separate runtimes built by domain teams via SDK + boilerplate; federate into platform via Sub-Agent registry over defined protocol; isolation is automatic (separate services)** | [ADR-021](../decisions/decision-log.md) |
| Skill execution model | In-process / process-isolated / WASM | **Process isolation by default; WASM at v1 for adapter-supplied code** | derivative of [ADR-021](../decisions/decision-log.md) |
| Sub-Agent SDK languages | TS only / TS+Python / TS+Python+Go / more | **TypeScript + Python at MVP**; Go at v1 if demand | [ADR-027](../decisions/decision-log.md) |
| Sub-Agent federation protocol | gRPC, HTTP, WebSocket, SSE, hybrid | **HTTP REST for admin/registry/metadata + gRPC bidirectional streaming for runtime (planner ↔ sub-agent)** | [ADR-028](../decisions/decision-log.md) |
| Sub-Agent discovery | Pull from registry / push (self-register) / hybrid | **Push (self-register on startup) + heartbeat + TTL for cleanup** | [ADR-029](../decisions/decision-log.md) |
| Sub-Agent authn | mTLS / JWT / both | **mTLS for runtime (intranet trust model, k8s cert-manager); JWT for non-runtime admin APIs** | [ADR-029](../decisions/decision-log.md) |
| Eval scoring approach | Heuristics / LLM-judge / embedded models / hybrid | **Hybrid: heuristics (cheap high-volume) + LLM-judge sampled (~5%, quality metrics) + embedded models at v1 + auto-generated per-capability eval from registry metadata** | [ADR-023](../decisions/decision-log.md) |
| Eval backend | Bundled / external | **Bundled in OSS tier** (storage on ClickHouse, scoring runners, regression detection, alerting hooks) | [ADR-023](../decisions/decision-log.md) |
| Eval dashboard | Bundled / external | **Bundled in OSS tier** (per-skill / per-sub-agent / per-feature trends, regressions, sample interactions) | [ADR-023](../decisions/decision-log.md) |
| Proactive engine — confidence | Single threshold / multi-signal / learned | **Multi-signal scoring at MVP; learned trigger model at v1** | [ADR-018](../decisions/decision-log.md) |
| Proactive engine — attention budget | Cap / bucket / adaptive / combined | **Combined: hard cap + token-bucket + per-user adaptation; defaults: max 2/session, max 5/day, host-configurable** | [ADR-018](../decisions/decision-log.md) |
| End-user tier/quota system | None / fixed / **configurable** | **Configurable per-tier quotas + per-user tracking + visible "X requests remaining" element** | [ADR-019](../decisions/decision-log.md) |
| Platform-vendor pricing model | Per-seat / per-conversation / capacity / open-core | **Open-core hybrid: free OSS substrate + paid Enterprise subscription (annual) + paid Capacity tiers (additive) unlocking high-novelty features (closed-loop VoC, churn model, federated learning, advanced eval, premium adapters)**; capacity unit = MAU (host-configurable) | [ADR-020](../decisions/decision-log.md) |
| Distribution / packaging | Docker / Helm / standalone binary / installer | **Docker Compose (dev/demo) + Helm chart (prod) at MVP**; standalone binary deferred; OS installers at v1.5 if demand | [ADR-026](../decisions/decision-log.md) |
| Eval dashboard tech | Bundled SPA / Grafana / custom + exporters | **Bundled SPA (React + Tremor/Recharts) at MVP, embedded in admin UI; optional exporters (Grafana / Datadog / Honeycomb) at v1** | [ADR-030](../decisions/decision-log.md) |
| Customer Churn ML Model architecture | GBT / small NN / ensemble / pluggable | **LightGBM bundled default + pluggable adapter + generic-prior cold-start (transitions to tenant-specific after ~1k events); SHAP explainability built-in** | [ADR-031](../decisions/decision-log.md) |
| MVP infra footprint | Substrate-only / full polyglot | **Full polyglot from day 1: PG + Qdrant + Redpanda + ClickHouse + Neo4j**. Closed-loop VoC + churn model are MVP scope | [ADR-032](../decisions/decision-log.md) |
| MVP anchor verticals | Single / dual / multi | **Dual: e-commerce + travel composite (Walmart/Best-Buy + Expedia/Booking archetype)** | [ADR-033](../decisions/decision-log.md) |
| OSS License | MIT / Apache 2.0 / AGPL / BSL | **Apache 2.0**; repo private until provisional patents filed for high-novelty entries | [ADR-035](../decisions/decision-log.md) |
| Monorepo tooling | pnpm WS / Yarn WS / Nx / Turborepo / Bun WS | **pnpm workspaces + Turborepo** (TS); Python SDK in `packages/sdk-py` with uv or poetry | [ADR-037](../decisions/decision-log.md) |
| Build team | Rahul-only / Rahul+Claude / external hires | **Rahul + Claude only** (no external hires for MVP) | [ADR-036](../decisions/decision-log.md) |
| CI/CD | GitHub Actions (default for our build) | GitHub Actions | — |
