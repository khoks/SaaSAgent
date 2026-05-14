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

### [2026-05-12] Proactive engine — ClickHouse persistence for per-day attention budget
**Source:** Phase 5 session 2026-05-12 — ADR-042 notes "per-day tracking requires a persistent store (ClickHouse) for production; at MVP it resets with server restart. Production persistence is a v1 item."
**Category:** capability / infrastructure
**Notes:** The `ProactiveEngine` ships at MVP with an in-memory attention counter. Per-day budget (default: max 5 proactive fires per user per day) resets every time the runtime restarts. For production deployments where the runtime may restart due to deploys or crashes, per-day budget must be durable. v1 upgrade: write `(userId, date, fireCount)` to ClickHouse on every proactive fire; read the current day's count on each tick. The `TierProvider`-pattern for quota is already ClickHouse-ready (same table design); proactive budget can share the same row-per-day schema.

### [2026-05-12] Capability eval — ClickHouse-backed persistent store and React SPA dashboard (v1 upgrade from MVP ring buffer)
**Source:** Phase 6 session 2026-05-12 — ADR-040 explicitly defers React SPA (ADR-030) and ClickHouse persistence to v1: "MVP eval is heuristic-only; LLM-judge sampling and ClickHouse persistence are wired when ClickHouse is operational (v1). React SPA remains the v1 target when the full ClickHouse-backed store is in place."
**Category:** capability / infrastructure
**Notes:** MVP `CapabilityEvalRunner` uses a 100-entry in-memory FIFO ring buffer per capability — intentionally lossy; long-running servers lose history on restart. v1 upgrade: (1) flush invocation records to ClickHouse on every `onInvocation` callback; (2) `GET /evals/capabilities` queries ClickHouse with configurable time-window; (3) replace the self-contained vanilla-JS HTML dashboard with the React + Tremor/Recharts SPA specified in ADR-030. The `CapabilityEvalRunner` interface is already designed with this migration in mind — swapping `InMemoryCapabilityEvalRunner` for `ClickHouseCapabilityEvalRunner` is the only change required.
