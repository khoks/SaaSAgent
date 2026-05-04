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

### [2026-04-26] Cached composition templates per recurring intent
**Source:** Implied by ADR-005 architecture; raised in conversation 2026-04-26.
**Category:** capability / optimization
**Notes:** The UI Composer LLM step is per-turn. For recurring intents (e.g., "show product comparison"), the composed JSON layout tree should be cacheable and reused with new data wiring. Saves model spend and reduces latency. **Status:** Application-level `CompositionCache` (LRU keyed by canonical intent fingerprint) is implemented in Phase 1.3. Anthropic prompt cache on the stable system prefix is wired; will activate once Phase 1.4 fills the registry to the 4096-token minimum.

### [2026-05-03] Phase 1.4.1 — AtomicComponentRegistry REST API + composer reads from registry
**Source:** Session 2026-05-03 — end-of-Phase-1.4.0 roadmap: "Phase 1.4.1 — `AtomicComponentRegistry` storage in the runtime + REST API for host registration + composer reads atomic primitives from the registry (replacing the hardcoded `Card/Heading/Text/Button/List` set in `composer/prompt.ts`)."
**Category:** capability
**Notes:** The hardcoded primitive set in `prompt.ts` is a stub. Phase 1.4.1 replaces it with a live registry stored in the runtime, exposed over REST so the host can register their own primitives. The HaikuComposer then reads from the registry dynamically at compose time. This is the foundational step for ADR-005 (runtime composition from the host's actual design system), not a mock catalog.

### [2026-05-03] Phase 1.4.2 — DTCG theme tokens importer
**Source:** Session 2026-05-03 — end-of-Phase-1.4.0 roadmap: "Phase 1.4.2 (DTCG theme tokens importer)."
**Category:** capability
**Notes:** Per ADR-025, the canonical theme representation is W3C Design Tokens (DTCG). Phase 1.4.2 wires a Style Dictionary importer that reads the host's token file and populates the runtime theme store, enabling the HaikuComposer to reference real brand tokens when building the system prompt. CSS variable fallback path needed for hosts without formal token systems.

### [2026-05-03] Phase 1.4.3 — Shell renders error layout from registered primitives on ErrorEnvelope
**Source:** Session 2026-05-03 — end-of-Phase-1.4.0 roadmap: "Phase 1.4.3 (shell renders an error layout from registered primitives when an `ErrorEnvelope` arrives)."
**Category:** capability
**Notes:** Currently the shell's `onServerError` callback fires when an `ErrorEnvelope` arrives (Phase 1.3.1), but error rendering is host-handled — the shell has no default error UI. Phase 1.4.3 gives the shell a default error layout built from registered atomic primitives (e.g., `ErrorCard` + `RetryButton` from the host's design system). Graceful degradation: if no error-specific primitives are registered, the shell falls back to a plain text message.

### [2026-05-03] Phase 2 — Planner + 3-tier capability invocation + .feature.md (MVP-of-MVP gate)
**Source:** Session 2026-05-03 — Phase sequencing summary: "Phase 2 → Planner + 3-tier capability invocation + .feature.md (MVP-of-MVP gate)."
**Category:** capability
**Notes:** Phase 2 is the first gate where the platform can do something useful end-to-end for the e-commerce + travel verticals. Key deliverables: (1) real Planner (`claude-sonnet-4-6`) that reads conversation context + Feature/Service docs + registry metadata and determines which Tools / Skills / Sub-Agents to invoke; (2) 3-tier capability invocation path (Tool = HTTP call, Skill = in-process function, Sub-Agent = gRPC federated call per ADR-028); (3) at least one `.feature.md` per vertical (`find-similar-product.feature.md` for e-commerce, `plan-multi-city-trip.feature.md` for travel) that the planner reads as super-skill context (ADR-013). After Phase 2, the agent can execute real workflows — not just render composed layouts from stubs.
