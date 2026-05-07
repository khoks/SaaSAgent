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

### [2026-05-06] DataSource `computed` expression runtime — JSONPath / JMESPath / safe DSL
**Source:** Phase 1.2 design discussion: "DataSource.computed takes an 'expression' string — deliberately vague at MVP; could be JSONPath, JMESPath, or a tiny safe DSL. Want me to lock it down at slice 1.2, or leave loose until we see real use cases?" Rahul: "keep the schemas loose."
**Category:** capability
**Notes:** The `computed` DataSource variant is defined in the protocol but its `expression` field is an opaque string at MVP — no evaluation engine exists yet. When real `.feature.md` use cases arrive that need computed data wiring (e.g., derived values from host-api responses), this expression runtime should be added. JSONPath is the leading candidate (well-specified, safe, broad tooling). Evaluate actual use cases first before committing — the schema is intentionally forward-compatible.

### [2026-05-06] Planner multi-round tool-use cap — configurable per enterprise policy
**Source:** Phase 2.1 design (ADR-042): "Multi-round tool-use loop, capped at 5 rounds (configurable). Sonnet can chain skill→tool→skill if it needs to." Rahul: "yes start phase 2."
**Category:** capability
**Notes:** The Phase 2.1 SonnetPlanner caps multi-round invocation at 5 rounds. Future: expose this as a configurable parameter per enterprise or per Feature/Service doc — some workflows (travel booking with 3+ API calls) may need higher limits; some security-sensitive deployments may want lower limits. Also: track tool-use round depth in ClickHouse eval telemetry to tune the default over time.

### [2026-05-06] Go SDK for Sub-Agent development (v1, deferred from ADR-027)
**Source:** ADR-027: "TypeScript + Python at MVP. Go added at v1 if enterprise demand emerges." Confirmed in conversation 2026-05-04.
**Category:** integration
**Notes:** Enterprise Go backend teams are a realistic sub-agent-authoring population (especially for ML infrastructure and data services). The Sub-Agent SDK contract (registration, federation protocol, health, retries, observability hooks) must be designed so a Go implementation is purely additive — same proto definitions, same registry schema, same federation protocol.

### [2026-05-06] Sub-Agent SDK full implementation — domain-team scaffolding CLI
**Source:** Conversation 2026-05-06 gap audit: "`packages/sdk-ts` has 1 file with 2 stub tests. ADR-021 promised an SDK that lets domain teams scaffold a sub-agent runtime in one command. Not built."
**Category:** capability
**Notes:** The `packages/sdk-ts` package exists as a stub. Full implementation requires: (a) `npx @saasagent/sdk init <name>` to scaffold a new sub-agent runtime from boilerplate, (b) SDK wrappers for registering capability descriptors, (c) SDK helpers for federation protocol (self-registration on startup, heartbeat, graceful deregistration), (d) typed handler registration surface. This is the primary DX surface for domain-team-owned sub-agent development and is critical to proving the federated architecture at scale. Related: ADR-021, ADR-027, ADR-029.

### [2026-05-06] Scaffolding CLI (`npx saasagent init`) — host integration bootstrapper
**Source:** Conversation 2026-05-06 gap audit: "`packages/cli/src/index.ts` is empty. Should be `npx saasagent init` to bootstrap a host integration (registers components, themes, tools)."
**Category:** capability
**Notes:** The `packages/cli` package is empty. The CLI should give a new host enterprise a fast path to onboarding: `npx saasagent init` outputs a starter host-integration scaffold (WC embed snippet, sample component registry seed, theme DTCG template, `docker-compose.yml` with all 5 stores, `.env.example`). Without this, each new host must manually assemble the integration. Priority: v1 (required for design-partner onboarding).

### [2026-05-06] Additional render modes — full-page, drawer, eject (beyond side-panel)
**Source:** Conversation 2026-05-06 gap audit: "Only `side-panel` works. `full-page`, `drawer`, `eject` declared in `RenderMode` type but no rendering logic."
**Category:** feature
**Notes:** The `RenderMode` type in the protocol includes `full-page`, `drawer`, and `eject` (agent "ejects" from its panel and takes over the full viewport). At MVP only `side-panel` has rendering logic. `full-page` and `drawer` are needed for mobile-native workflows and progressive-disclosure patterns (the ADR-034 "wow" target may require full-page mode for multi-step flows). `eject` is the most novel and the one most aligned with ADR-034's "host UI becomes admin/legacy" positioning — related to ADR-004.

### [2026-05-06] Mobile-context auto-population in WC shell
**Source:** Conversation 2026-05-06 gap audit: "`MobileContext` typed in protocol (deviceClass / viewportWidth / inputMode / networkClass). Composer reads it. Nothing populates it — the shell never measures the device or fills it in."
**Category:** capability
**Notes:** `MobileContext` is fully typed in `@saasagent/protocol` and the HaikuComposer is wired to read it. But the WC shell never calls `navigator.userAgent`, `window.innerWidth`, or `navigator.connection` to populate the context object. Until this is implemented, the composer composes without device awareness — layouts are not adapted for mobile viewports or reduced-bandwidth modes. Related to ADR-017 (WebView bridge + mobile-context-aware composition).

### [2026-05-06] Demo verticals with seeded data — e-commerce and travel showcase apps
**Source:** Conversation 2026-05-06 gap audit: "`apps/` has only `demo-host` (a generic shell demo). The vision spec called out e-commerce + travel demo verticals end-to-end with seeded products / flights / etc. Not built."
**Category:** feature
**Notes:** The current `apps/demo-host` is a generic one-page demo. ADR-033 requires two full demo verticals: (1) **E-commerce** (Walmart/Best-Buy archetype): seeded product catalog, `ProductTile`, `ComparisonGrid`, `CartButton` primitives, `find-similar-product.feature.md` workflow, cart-abandonment proactive trigger; (2) **Travel** (Expedia/Booking archetype): seeded flight/hotel data, `FlightCard`, `ItineraryTimeline`, `DateRangePicker` primitives, `plan-multi-city-trip.feature.md` workflow. Without these, the MVP demo cannot prove vertical-agnosticism or hit the ADR-034 "wow" bar. Priority: required for design-partner conversations.

### [2026-05-06] gRPC bidirectional streaming for sub-agent runtime invocation (ADR-028 fulfillment)
**Source:** Conversation 2026-05-06 gap audit + ADR-028: "HTTP REST for admin + gRPC bidirectional streaming for runtime." Current implementation uses HTTP POST on `/federate`.
**Category:** capability
**Notes:** ADR-028 specifies gRPC bidirectional streaming for the planner ↔ sub-agent runtime channel (planner sends task; sub-agent streams progress + intermediate results back). The Phase 2.4.x `/federate` endpoint is HTTP POST (single request/response). gRPC gives: typed contracts (proto files enforce SDK contracts across TS + Python), bidirectional streaming for live sub-agent progress events, HTTP/2 multiplexing. HTTP POST `/federate` is an acceptable MVP shortcut; gRPC is the v1 upgrade path. Proto files should be designed now so the TS + Python SDKs share the schema.

### [2026-05-06] Python Sub-Agent SDK (`packages/sdk-py`)
**Source:** ADR-027: "TypeScript + Python at MVP." Conversation 2026-05-06 gap audit: Python SDK not built. `packages/sdk-py` referenced in tech-stack.md but does not exist yet.
**Category:** integration
**Notes:** Python is the primary language for ML infrastructure and data-service domain teams — the most likely sub-agent authors in large enterprises. Without a Python SDK, domain ML/data teams cannot author sub-agents without bridging to TypeScript. Required for ADR-027 compliance. Package layout: `packages/sdk-py/` with uv or poetry, mirroring the TS SDK's registration + federation + health surfaces. Same proto definitions as the TS SDK; code-gen from shared proto files.

### [2026-05-06] LightGBM churn model training pipeline and integration (v1, ADR-031 target)
**Source:** ADR-031: "LightGBM bundled default + pluggable adapter." ADR-046: "`WeightedFeatureChurnCalculator` (sigmoid linear model) as MVP stepping stone; LightGBM at v1." Conversation 2026-05-06.
**Category:** capability
**Notes:** The Phase 2.6.x `WeightedFeatureChurnCalculator` is a parameterized linear model with hand-tuned default weights. LightGBM is the v1 upgrade — requires: (a) a training pipeline that consumes accumulated EvalSignals from ClickHouse, (b) LightGBM model training + serialization, (c) SHAP explainability (ADR-031), (d) plugging the trained model into the `ChurnCalculator` interface as `LightGBMChurnCalculator`. Cold-start strategy: generic-prior model (ADR-031) until ~1k real churn events are available. The `ChurnCalculator` pluggable interface is already in place — this is a pure implementation addition.
