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

### [2026-05-06] Full LightGBM churn model replacing linear placeholder
**Source:** Conversation 2026-05-06 — "WeightedFeatureChurnCalculator. Parameterized linear model with sigmoid → step toward real ML"; ADR-043 explicitly defers full LightGBM to v1.
**Category:** capability
**Notes:** The current MVP churn model (`WeightedFeatureChurnCalculator`) is a parameterized linear weighted sum + sigmoid. ADR-031 specifies LightGBM with SHAP explainability, generic-prior cold-start (transitions to tenant-specific after ~1k events), and a pluggable adapter for hosts with existing models. v1 delivery: swap `WeightedFeatureChurnCalculator` for a full training/inference pipeline. Both implement the same `ChurnRiskCalculator` interface so the upgrade is an adapter swap, not a re-architecture.

### [2026-05-06] Voice and multimodal I/O (Phase 5 — WebRTC)
**Source:** Conversation 2026-05-06 — "WebRTC reserved for voice (Phase 5) when microphone capture and TTS narration land; voice has different latency / codec characteristics that warrant a third channel."
**Category:** capability
**Notes:** Phase 5 (post-MVP) adds microphone capture, TTS narration, and multimodal visual DOM interaction over a WebRTC channel. The SSE (output stream) and WS (instruction RPC) channels remain; WebRTC is the third, specialized for voice/audio codec characteristics. The agent's composer must gain multimodal awareness (voice-appropriate response length, TTS phrasing, audio-turn protocol). This also enables hands-free interaction for mobile users.

### [2026-05-06] Proactive engine implementation
**Source:** Conversation 2026-05-06 — gap analysis identified proactive engine (ADR-018) as not yet built.
**Category:** capability
**Notes:** ADR-018 fully specced: multi-signal confidence scoring (planner confidence + memory match + workflow continuity + DOM-state relevance + time-since-last-interaction) + combined attention budget (hard cap + token-bucket + per-user adaptation). Not built in Phase 2–5. The attention budget's per-user adaptation depends on the eval/churn feedback loop (now live) — so the prerequisite infrastructure is in place. v1 milestone: implement the trigger engine and hook it into the existing WS push path.

### [2026-05-06] VoC embedded dashboard
**Source:** Conversation 2026-05-06 — gap analysis; ADR-016 + ADR-030 decided dashboard, not yet built.
**Category:** capability
**Notes:** ADR-030 specifies a bundled SPA (React + Tremor/Recharts), embedded in the admin UI, showing per-skill / per-sub-agent / per-feature eval trends, regressions, sample interactions. Optional exporters to Grafana/Datadog/Honeycomb at v1. The underlying ClickHouseMemoryProvider and eval signal pipeline (now built in Phase 2.5) are the data foundation. The dashboard is the UI layer on top.

### [2026-05-06] Multi-hop agent federation depth limit + circuit-breaker
**Source:** Conversation 2026-05-06 — symmetric /federate endpoint enables multi-hop chains (ADR-042); open question on depth limits.
**Category:** capability / safety
**Notes:** Symmetric federation (any runtime can delegate to any other) enables multi-hop chains of arbitrary depth. Future: configurable max-hop depth limit to prevent runaway delegation cycles. Circuit-breaker at the sub-agent executor level to interrupt chains that exceed latency or cost budgets. Distributed trace correlation across hops for observability.
