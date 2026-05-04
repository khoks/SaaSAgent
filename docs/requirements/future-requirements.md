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

### [2026-04-26] Mobile app embedding (parity with web)
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** Adobe, Canva, Expedia, Best Buy, Walmart, Shopify all have native mobile apps. Platform must work in mobile contexts, not only web. Native SDK? React Native? WebView bridge? — open.

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

### [2026-04-26] Cached composition templates per recurring intent
**Source:** Implied by ADR-005 architecture; raised in conversation 2026-04-26.
**Category:** capability / optimization
**Notes:** The UI Composer LLM step is per-turn. For recurring intents (e.g., "show product comparison"), the composed JSON layout tree should be cacheable and reused with new data wiring. Saves model spend and reduces latency.

### [2026-05-03] Native mobile SDKs (iOS Swift + Android Kotlin) at v1.5
**Source:** ADR-017 (2026-04-28): "v1.5: native SDKs (iOS / Android) for hosts who need full native UX."
**Category:** capability / integration
**Notes:** MVP uses a WebView bridge with a thin native shim (ADR-017). Hosts with high-performance native UX requirements — deep animations, biometrics, OS-level push, intricate gesture handling — will need first-class native SDKs. SDK contracts are designed at MVP to allow native SDK addition at v1.5 without re-architecting the protocol or registry layers. Thin shim per platform handles: launching the agent overlay, providing app-screen state, routing native events (microphone, push, biometrics).

### [2026-05-03] Voice I/O via WebRTC (Phase 5)
**Source:** ADR-038 (2026-05-03): "WebRTC reserved for voice (Phase 5) when microphone capture and TTS narration land; voice has different latency / codec characteristics that warrant a third channel."
**Category:** capability
**Notes:** Phase 5 introduces a third real-time channel alongside SSE (planner streaming) and WebSocket (instruction emit). Voice requires: (a) microphone capture with voice-activity detection, (b) TTS narration model (host-supplied or bundled), (c) WebRTC for the low-latency duplex audio path. Mobile WebView bridge shim must route native microphone permissions. Desktop uses Web Audio API. Voice is architecturally separated because it has fundamentally different codec, latency, and session-lifecycle characteristics from the text-based protocol channels.
