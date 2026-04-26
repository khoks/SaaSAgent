# Tech Stack

> Living document. Auto-maintained by the `extract-insights` skill.

## Status: Decisions in progress.

| Layer | Candidate options | Decision | ADR |
|---|---|---|---|
| Agent runtime language | TypeScript, Python, Rust, Go | TBD (TS leaning, given WC shell + Claude Agent SDK ergonomics) | — |
| Foundation model provider | Anthropic (default), provider abstraction | **Anthropic** at v0, behind a thin internal interface | [ADR-007](../decisions/decision-log.md) |
| Agent framework | Claude Agent SDK, LangGraph, bespoke | **Claude Agent SDK** at substrate; bespoke orchestrator/planner/thinker/composer on top | [ADR-007](../decisions/decision-log.md) |
| Embed surface | Web Component, React SDK, iframe, all | **Web Component shell** with multi-framework component registry inside | [ADR-004](../decisions/decision-log.md) |
| UI rendering model | SDUI catalog, shipped components, generative UI, **DS composition** | **Runtime composition from host's atomic design system** | [ADR-005](../decisions/decision-log.md) |
| Component registry framework support | React only / multi-framework | **Multi-framework: React, Vue, Svelte, Angular, vanilla WC** | [ADR-004](../decisions/decision-log.md) |
| Multi-framework runtime | Module Federation, per-framework adapters, custom-element wrappers | TBD — see Batch 2 grooming | — |
| Theme/branding tokens | Style Dictionary, Spectrum tokens, CSS variables, custom | TBD | — |
| State / memory store | pgvector, Pinecone, Weaviate, Qdrant, Chroma, hybrid w/ KG | TBD — must be embeddable since enterprise hosts | — |
| Time-windowed behavior store | ClickHouse, TimescaleDB, custom AI-native store | TBD | — |
| Event bus integration | Kafka, NATS, webhooks, host-defined adapter | Adapter pattern (host-defined) | derivative of [ADR-006](../decisions/decision-log.md) |
| Mobile embedding | React Native, native SDKs (iOS/Android), WebView bridge | TBD | — |
| Multi-tenancy model | Pool, silo, hybrid | **Single-tenant (one deployment per enterprise)** | derivative of [ADR-006](../decisions/decision-log.md) |
| Real-time transport | WebSocket, SSE, WebRTC (for voice), hybrid | TBD | — |
| Observability stack | OpenTelemetry, custom, hosted | OpenTelemetry (host-controlled exporters) | derivative of [ADR-006](../decisions/decision-log.md) |
| Auth model | Bring-your-own (host SSO), platform-issued tokens | **Bring-your-own (host SSO)** | derivative of [ADR-006](../decisions/decision-log.md) |
| Distribution / packaging | Docker / Helm / standalone binary | TBD | — |
| CI/CD | GitHub Actions (default for our build) | GitHub Actions | — |
