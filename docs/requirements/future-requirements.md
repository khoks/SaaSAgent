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

### [2026-05-10] Sub-agent stub-mode deterministic execution (LLM-less integration testing)
**Source:** E2E Expedia testing session 2026-05-10 — when StubPlanner is active (no API key), `/federate` returns `{}` because no planner invocations fire; surfaced as a concrete developer-onboarding gap.
**Category:** capability
**Notes:** When a sub-agent is configured with StubPlanner (no LLM key), the current contract returns an empty `{output:{}}` because the planner issues no invocations. In dev/CI environments without an API key, developers cannot smoke-test end-to-end multi-agent flows at all. A future "deterministic stub mode" would allow sub-agents to declare a static response handler (or a registry of skill stub responses) used when the planner is a stub. This would let all five onboarding tiers (runtime → sub-agent → skill → tool → federate) be exercised without any cloud dependency, enabling CI testing and local onboarding with zero API cost.

### [2026-05-10] Enterprise developer CLI scaffolding (`create-saas-agent-app`)
**Source:** E2E Expedia testing session 2026-05-10 — the `apps/demo-expedia/` reference integration required ~30 lines of boilerplate across 2 server files; a CLI tool would eliminate even that friction.
**Category:** capability / integration
**Notes:** The Expedia reference integration demonstrated that the runtime onboarding is already minimal (~30 lines to register skills + sub-agents + start server). The logical next step is a `create-saas-agent-app` CLI (analogous to `create-react-app`, `create-next-app`) that scaffolds a new vertical integration with: pre-wired runtime server, example skills, a trip-planner-style sub-agent stub, a host HTML page with the WC shell, and mock API endpoints. Should read from a template in the repo (similar to `apps/demo-expedia/`) and personalize to the vertical (name, port, brand colors). This would reduce enterprise onboarding from "read 6 files to understand the pattern" to "one command + answer 3 prompts."

### [2026-05-12] RedisTierProvider for horizontally-scaled per-user quota enforcement
**Source:** ADR-041 (Phase 7): "In-memory counters do not survive a runtime restart. Acceptable for MVP (counters reset → users get more quota → no harm done). RedisTierProvider fixes this at v1."
**Category:** capability / infrastructure
**Notes:** `InMemoryTierProvider` uses a per-WS `Map` for quota counters; these reset on runtime restart and cannot be shared across multiple runtime instances. V1 requires a `RedisTierProvider` implementing the same `TierProvider` interface, backed by Redis atomic INCR + TTL-keyed per (userId, UTC-date). Enables horizontal scaling of the runtime without quota drift. The sessionId→userId mapping (currently identity at MVP) should also be wired to a real AuthProvider by v1.

### [2026-05-12] TokenBudgetTierProvider composable with MeteringProvider (v1)
**Source:** ADR-041 (Phase 7): "Per-user request count per UTC day for MVP. Model-token or compute cost deferred to v1. The MeteringProvider already records token usage; a future TokenBudgetTierProvider can compose with it."
**Category:** capability
**Notes:** Phase 7 limits on request count (coarse). V1 should also support token-budget tiers (hosts want to give "free tier = 10k tokens/day"). The `MeteringProvider` (Phase 2.x) already records token usage per session. A composable `TokenBudgetTierProvider` wraps `MeteringProvider` + `TierProvider` to enforce token limits alongside (or instead of) request limits. Opens up more granular pricing models for host enterprises.

### [2026-05-12] Redis-backed InMemoryAttentionBudget for distributed proactive engine deployments
**Source:** ADR-043 (Phase 5): "In-memory budget: a runtime restart resets per-session budgets. Acceptable for Phase 5; Redis-backed variant lands in v1 for horizontally-scaled deployments."
**Category:** capability / infrastructure
**Notes:** `InMemoryAttentionBudget` stores per-session fire counts in a `Map`. In a load-balanced deployment with multiple runtime instances, a session may be routed to different instances, causing budget to be counted independently per instance. V1 needs a Redis-backed `AttentionBudget` with atomic `INCR` + per-session TTL, implementing the same `AttentionBudget` interface.

### [2026-05-12] LLM-judge capability eval (sampled ~5%) for quality beyond heuristics
**Source:** ADR-042 (Phase 6): "LLM-judge deferred. The hybrid scoring promised in ADR-023 (heuristics every interaction + LLM-judge sampled ~5%) extends naturally — add a second `evaluateAsync(invocation, descriptor)` interface."
**Category:** capability
**Notes:** Phase 6 ships 3 heuristic checks (outcome-success, output-non-empty, latency-budget). These answer "did it work?" but not "was it good?". The ADR-023 hybrid eval requires a second scoring pass: for ~5% of invocations, send the input + output + capability descriptor to an LLM judge (Haiku or Sonnet) with a rubric derived from the capability's `whenToUse` + success-criteria fields in the registry. This provides richer quality assessment but requires model spend per sample. The `CapabilityEvalRunner` interface accommodates an async `evaluateAsync` extension without breaking existing heuristic path.

### [2026-05-12] Full AuthProvider principal threading at the WebSocket boundary (v1)
**Source:** ADR-041 (Phase 7): "What identifies 'a user' for quota? Without full AuthProvider principal threading at the WS boundary (deferred), the MVP grain is sessionId."
**Category:** capability / infrastructure
**Notes:** The MVP uses `sessionId` as the quota userId grain — one bucket per WS connection. This breaks when the same logged-in user opens multiple browser tabs (each gets its own budget) or crosses sessions. V1 needs AuthProvider threading: the WS handshake extracts a principal from the host's SSO token (already required on the initial connect per ADR-038), and this principal is propagated through `TierProvider`, `MeteringProvider`, `ProactiveEngine.budget`, and `EvalProvider` so all per-user tracking is identity-consistent.

### [2026-05-12] ML-driven proactive scoring to replace linear weighted sum (v1)
**Source:** ADR-043 (Phase 5): "These are tunable; the proper ML model in v1 replaces them with learned signals." and "Hosts that want ML scoring (LightGBM etc.) implement `ProactiveScorer` and swap in via configuration."
**Category:** capability / research
**Notes:** Phase 5 uses a linear weighted sum of 5 server-side signals with hand-tuned weights (plannerConfidence 0.35, workflowContinuity 0.25, domRelevance 0.20, memoryMatch 0.10, timeSinceLastTouch 0.10). Two signals (plannerConfidence, memoryMatch) are stubs pending planner/memory introspection. V1 upgrade: (1) wire real plannerConfidence from SonnetPlanner's logit-level signal, (2) wire memoryMatch from per-session memory recall scoring, (3) train a LightGBM `ProactiveScorer` on accept/dismiss feedback signals from `InMemoryAttentionBudget.tryConsume` outcomes, transitioning from hand-tuned to data-driven weights. The `ProactiveScorer` interface is already pluggable.
