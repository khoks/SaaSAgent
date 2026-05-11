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

### [2026-05-08] Voice I/O channel via WebRTC (Phase 5)
**Source:** ADR-038 (conversation 2026-05-08): "WebRTC reserved for voice in Phase 5 when microphone capture and TTS narration land; voice has different latency / codec characteristics that warrant a third channel."
**Category:** capability
**Notes:** The real-time transport design (ADR-038) reserves WebRTC as a dedicated third channel for Phase 5 voice features. SSE (planner output) and WebSocket (typed instruction emit) are insufficient for the latency/codec requirements of voice. Phase 5 brings: microphone capture in the WC shell, server-side WebRTC peer-connection endpoint, TTS narration output stream, and integration with the existing composited UI surface. Requires voice-aware planner mode and narration-aware UI composer.
