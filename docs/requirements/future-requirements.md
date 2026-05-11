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

### [2026-05-03] Phase 1.4: Atomic UI Component registry + DTCG theme tokens importer + Vite browser demo
**Source:** Session 2026-05-03, Phase 1.3 closure: "Phase 1.4 → Atomic UI Components registry replacing the hardcoded primitives in `prompt.ts`, DTCG theme tokens importer, and a Vite-bundled browser demo so the loop runs in an actual browser tab instead of curl/JSDOM."
**Category:** capability / infrastructure
**Notes:** The hardcoded `Card → Text → Button` primitives in `HaikuComposer/prompt.ts` are placeholders. Phase 1.4 replaces them with a runtime-loaded `AtomicComponent` registry (schema defined in `@saasagent/protocol`). The DTCG theme tokens importer (ADR-025) is wired in this phase to populate the Anthropic prompt-cache prefix (4096-token min on Haiku 4.5 — won't activate until the registry has real content). The Vite-bundled browser demo converts the current JSDOM test harness into a real browser tab, proving the WC shell renders correctly with live SSE/WS connections to the runtime.

### [2026-05-03] Phase 2: Planner + 3-tier capability invocation + .feature.md (MVP-of-MVP gate)
**Source:** Session 2026-05-03, Phase 1.3 closure: "Phase 2 → Planner + 3-tier capability invocation + .feature.md (MVP-of-MVP gate)."
**Category:** capability
**Notes:** Phase 2 adds: (a) the planner layer (`claude-sonnet-4-6`, per ADR-007/ADR-012) that orchestrates multi-turn conversations; (b) the three-tier capability invocation model — Tools → Skills → Sub-Agents (ADR-021) — wired to the planner; (c) `.feature.md` document loading (ADR-013) so domain-dev feature documents influence planner decisions at runtime. Phase 2 completion defines the MVP-of-MVP: a real end-to-end conversation where a user intent drives planner-directed composition from the host's atomic design system, invoking a registered feature. Everything in Phases 0–1 is scaffolding for this moment.

### [2026-05-03] Composer error UX: SSE event:error emission when composer fails (deferred from Phase 1.3)
**Source:** Session 2026-05-03, Phase 1.3 live smoke: "When Haiku fails, the runtime currently logs the error but the SSE client just hangs (no event delivered → 30 s timeout). The right behavior is to emit an `event: error\ndata: {...}\n\n` SSE message so the shell can render an error layout."
**Category:** capability / quality
**Notes:** If both HaikuComposer (Haiku 4.5) and SonnetFallbackComposer (Sonnet 4.6 + adaptive thinking) fail, the runtime logs the error but sends no SSE event. The shell times out silently after ~30 s. Fix: `RuntimeServer.handleRequest` must catch composer errors and emit a typed SSE error event, giving the shell enough context to render a graceful error state (e.g., "I'm having trouble right now — please try again"). Explicitly deferred to Phase 1.3.1 polish or Phase 1.4 error-handling pass.
