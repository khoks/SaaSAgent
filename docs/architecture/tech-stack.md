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
| Component registry framework support | React only / multi-framework | **Multi-framework: React, Vue, Svelte, Angular, vanilla WC** (MVP scope TBD — see Batch 3) | [ADR-004](../decisions/decision-log.md) |
| Multi-framework runtime | Module Federation, per-framework adapters, custom-element wrappers, hybrid | **WC-wrap by default + native-renderer escape hatch** for performance-critical primitives | [ADR-010](../decisions/decision-log.md) |
| DS registration intake | Manual / Storybook auto-extract / metadata extract / hybrid | **Hybrid: all three paths + manual augmentation layer** | [ADR-009](../decisions/decision-log.md) |
| Theme/branding tokens | Style Dictionary, Spectrum tokens, CSS variables, custom | TBD | — |
| Feature/Service doc format | YAML / JSON / Markdown+frontmatter+inline-JSON | **`.feature.md` — Markdown + YAML frontmatter + inline JSON** | [ADR-011](../decisions/decision-log.md) |
| Feature/Service NL→JSON compilation timing | Registration-time / runtime | TBD (Batch 3) | — |
| Memory: raw + workflow + active feedback + profiles | Postgres / DynamoDB / SQLite | **Postgres (append-only raw log + structured derived)** | [ADR-008](../decisions/decision-log.md) |
| Memory: semantic recall (vector) | pgvector, Pinecone, Weaviate, **Qdrant**, Chroma | **Qdrant** (default; pluggable) | [ADR-008](../decisions/decision-log.md) |
| Memory: time-tiered summaries + eval + telemetry + VoC analytics | TimescaleDB, **ClickHouse**, Druid | **ClickHouse** (v1; pluggable) | [ADR-008](../decisions/decision-log.md) |
| Memory: problem-solution graph + VoC relations | **Neo4j**, ArangoDB, Dgraph, Memgraph | **Neo4j** (v1; pluggable) | [ADR-008](../decisions/decision-log.md) |
| Stream processing for derivation pipeline | In-process workers, Redpanda, Kafka, Temporal | TBD (Batch 3) | — |
| Embedding model | Anthropic embeddings, OSS (BGE / E5 / nomic), host-supplied | TBD | — |
| Event bus integration | Kafka, NATS, webhooks, host-defined adapter | Adapter pattern (host-defined) | derivative of [ADR-006](../decisions/decision-log.md) |
| Mobile embedding | React Native, native SDKs (iOS/Android), WebView bridge | TBD (Batch 3) | — |
| Multi-tenancy model | Pool, silo, hybrid | **Single-tenant (one deployment per enterprise)** | derivative of [ADR-006](../decisions/decision-log.md) |
| Real-time transport | WebSocket, SSE, WebRTC (for voice), hybrid | TBD | — |
| Observability stack | OpenTelemetry, custom, hosted | OpenTelemetry (host-controlled exporters) | derivative of [ADR-006](../decisions/decision-log.md) |
| Auth model | Bring-your-own (host SSO), platform-issued tokens | **Bring-your-own (host SSO)** | derivative of [ADR-006](../decisions/decision-log.md) |
| Distribution / packaging | Docker / Helm / standalone binary / installer | TBD (Batch 3) | — |
| CI/CD | GitHub Actions (default for our build) | GitHub Actions | — |
