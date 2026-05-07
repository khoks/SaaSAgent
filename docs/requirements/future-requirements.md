# Future Requirements

> Auto-maintained by the `extract-insights` skill. Every future-looking item Rahul or Claude raises in conversation lands here, with date and source.

## Format
Each entry:
```
### [YYYY-MM-DD] Title
**Source:** conversation snippet or summary
**Category:** vision | feature | capability | integration | research | other
**Notes:** rationale, open questions, related decisions
```

## Entries

### [2026-04-26] Proactive agent that pops up unprompted
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** Future state — agent decides on its own when the user needs attention or when there is a next-best-action. Requires: continuous insight into host SaaS service catalog, attention-budget engine, confidence gating. To be groomed under FR-P.

### [2026-04-26 / clarified 2026-05-03] Mobile app embedding (parity with web)
**Source:** Initial vision dump from Rahul; ADR-017 closed the MVP choice.
**Category:** capability
**Notes:** Adobe, Canva, Expedia, Best Buy, Walmart, Shopify all have native mobile apps. Platform must work in mobile contexts, not only web. **MVP decision (ADR-017):** WebView bridge with mobile-context-aware composition. **v1.5:** native SDKs (React Native; iOS/Android) if demand. The WC shell is aware at composition time whether it is running in a mobile WebView vs. desktop/laptop/tablet and adapts layout composition accordingly.

### [2026-04-26] AI-native stores for time-windowed behavior queries
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** "What was the user doing in the past 2 minutes / 10 minutes / week / year?" Requires purpose-built stores beyond traditional event logs. Architecture-level decision pending.

### [2026-04-26] Cross-session memory of solutions accepted vs. rejected
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** Memory tracks not just what was said, but which suggestions the user took, which they ignored, and which they pushed back on. Drives personalization and trust calibration over time.

### [2026-04-26] Universal agent surface across an entire app/OS ecosystem (Google-style)
**Source:** Rahul Q1 answer 2026-04-26: "I would have liked to anchor the design for something like the google's app/OS ecosystem, but that is like the ultimate use case."
**Category:** vision
**Notes:** The end-state aspiration: a single agentic substrate operating not inside one host SaaS but **across every app and surface a user touches** (think: Google's app + OS ecosystem — agent that knows your Gmail, Calendar, Maps, Photos, Drive, Android state simultaneously, with cross-app memory and orchestration). MVP is the single-host-embedded model; design today should not foreclose the multi-host future. Implications for: cross-app identity, federated memory, cross-host workflow orchestration, app-discovery protocol.

### [2026-04-26] Federated cross-enterprise learning (opt-in)
**Source:** Implied by ADR-006 self-hosted decision; raised in conversation 2026-04-26.
**Category:** capability
**Notes:** Self-hosted distribution kills cross-customer telemetry by default. Future opt-in mode: enterprises can contribute anonymized pattern data (planner traces, composition templates, skill-usage statistics) to a federated learning pool, in exchange for receiving aggregated improvements. Privacy-preserving (DP / federated aggregation). Strictly opt-in, off by default. Avoids the "self-hosted means no product feedback loop" trap.

### [2026-04-26] Auto-extraction of host design system from existing artifacts
**Source:** Implied by ADR-005; raised in conversation 2026-04-26.
**Category:** capability
**Notes:** Host design-system registration is manual at MVP. Future: auto-extract from Storybook (CSF), Figma design tokens, component metadata files, MDX docs. Reduces onboarding friction substantially.

### [2026-05-05] Upgrade SubAgentExecutor to gRPC bidirectional streaming (ADR-028 target)
**Source:** Phase 2.4 implementation (conversation 2026-05-05) used HTTP fetch + JSON envelopes as an MVP concession (ADR-039); ADR-028 specifies gRPC bidirectional streaming for the runtime planner ↔ sub-agent channel as the v1 production target.
**Category:** capability / infrastructure
**Notes:** MVP `SubAgentExecutor` uses HTTP POST with `FederationRequest`/`FederationResponse` JSON envelopes — this loses real-time streaming of intermediate sub-agent progress signals. v1 upgrade: (1) add proto definitions for the federation protocol, (2) switch `SubAgentExecutor` to gRPC bidirectional streaming, (3) update the TS and Python sub-agent SDK server stubs to expose a gRPC server. The executor and SDK stubs are the only upgrade surface. Delivers streaming progress signals from sub-agents back to the planner mid-execution.

### [2026-04-26] Cached composition templates per recurring intent
**Source:** Implied by ADR-005 architecture; raised in conversation 2026-04-26.
**Category:** capability / optimization
**Notes:** The UI Composer LLM step is per-turn. For recurring intents (e.g., "show product comparison"), the composed JSON layout tree should be cacheable and reused with new data wiring. Saves model spend and reduces latency.

### [2026-05-07] Native iOS/Android SDKs (v1.5)
**Source:** ADR-017 consequences: "v1.5: native SDKs (iOS / Android) for hosts who need full native UX."
**Category:** capability
**Notes:** MVP uses WebView bridge + thin native shim (ADR-017). At v1.5, ship first-party native SDKs (iOS Swift + Android Kotlin) for hosts that require full native rendering performance, deep system integration (biometrics, push, camera), or app-store guidelines that restrict WebView usage.

### [2026-05-07] Go Sub-Agent SDK (v1)
**Source:** ADR-027: "Go added at v1 if enterprise demand emerges."
**Category:** capability / integration
**Notes:** MVP SDK covers TypeScript + Python (the two most common domain-team languages). Go is next-highest for backend-heavy enterprises. Shares the same gRPC proto definitions and federation protocol — SDK is a language binding, not a new protocol.

### [2026-05-07] Observability exporters for existing ops stacks (v1)
**Source:** ADR-030: "optional exporters at v1 to host's existing observability (Grafana, Datadog, Honeycomb)."
**Category:** integration
**Notes:** MVP ships a bundled eval SPA for quality visibility. At v1 add push exporters so eval signal + agent telemetry flows into the host's existing dashboards (Grafana, Datadog, Honeycomb). Hosts who have standardized observability do not want a second dashboard for agent-specific data.

### [2026-05-07] Voice interface via WebRTC (Phase 5)
**Source:** ADR-038: "WebRTC reserved for voice (Phase 5) when microphone capture and TTS narration land."
**Category:** capability
**Notes:** Current transport stack is SSE (planner→shell) + WebSocket (bidirectional instruction). Voice requires a third channel with different latency / codec characteristics. Phase 5 adds microphone capture, server-side ASR, TTS narration, and WebRTC as the voice-data transport. Multi-modal completion of the I/O surface (text + DOM + voice).

### [2026-05-07] Figma Tokens import for design-system registration
**Source:** ADR-025: "Future: Figma Tokens import."
**Category:** capability / integration
**Notes:** MVP design-system registration supports W3C DTCG canonical schema, Style Dictionary importer, and CSS variable fallback (ADR-025). Figma Tokens (exported from Figma Variables / design token plugins) is the highest-friction missing path — most design teams author tokens in Figma, not in code. Adding a Figma Tokens importer closes the onboarding gap for design-led teams.

### [2026-05-07] WASM sandbox for adapter-supplied skill code (v1)
**Source:** ADR-021 consequences: "Skills isolation — WASM at v1 for adapter-supplied skill code."
**Category:** capability / security
**Notes:** MVP runs skill handlers in-process (with process-level isolation as the safety boundary). For skills authored by enterprise adapter teams — not the platform's own code — WASM sandboxing at v1 provides a stronger isolation guarantee without requiring a separate process per skill. Prevents runaway adapter skills from affecting platform stability.

### [2026-05-07] Public OSS release after provisional patent filing
**Source:** ADR-035: "Process: file provisional patents when each component reaches working-prototype state … Then make repo public + publish under Apache 2.0."
**Category:** other
**Notes:** The repo is private until provisional applications are filed for the patentability-strong novel entries (ADR-005 UI composition, ADR-016 closed-loop VoC + churn, ADR-021 federated sub-agents, ADR-023 auto-eval). Public OSS release + Apache 2.0 is a Phase 9 (release) gate, not Phase 0–8. Budget ~$2–5k per filing via patent counsel.
