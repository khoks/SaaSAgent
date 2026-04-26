# Tech Stack

> Living document. Auto-maintained by the `extract-insights` skill.

## Status: All TBD — pending grooming.

| Layer | Candidate options | Decision | ADR |
|---|---|---|---|
| Agent runtime language | TypeScript, Python, Rust, Go | TBD | — |
| Foundation model provider | Anthropic (default), multi-provider abstraction | TBD | — |
| Agent framework | Claude Agent SDK, LangGraph, bespoke | TBD | — |
| Embed surface | Web Component, React SDK, iframe, all | TBD | — |
| Widget protocol | JSON-spec server-driven, React components, hybrid | TBD | — |
| State / memory store | pgvector, Pinecone, Weaviate, Qdrant, Chroma, hybrid w/ KG | TBD | — |
| Time-windowed behavior store | ClickHouse, TimescaleDB, custom AI-native store | TBD | — |
| Event bus integration | Kafka adapter, NATS, webhooks, host-defined | TBD | — |
| Mobile embedding | React Native, native SDKs (iOS/Android), WebView bridge | TBD | — |
| Multi-tenancy model | Pool model, silo model, hybrid | TBD | — |
| Real-time transport | WebSocket, SSE, WebRTC (for voice), hybrid | TBD | — |
| Observability stack | OpenTelemetry, custom, hosted (Datadog, Honeycomb) | TBD | — |
| Auth model | Bring-your-own (host SSO), platform-issued tokens, both | TBD | — |
| CI/CD | GitHub Actions (default) | TBD | — |
