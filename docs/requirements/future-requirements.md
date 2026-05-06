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
