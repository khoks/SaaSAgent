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

### [2026-05-06] Postgres-backed memory persistence (production-grade MemoryProvider)
**Source:** Phase 2.3 transcript: "Skipping Phase 2.3.x (Postgres seam already proven via KeyValueMemoryProvider; real Postgres impl needs CI/Docker infra that's a future deliverable)."
**Category:** capability
**Notes:** `KeyValueMemoryProvider` shipped in Phase 2.3 is an in-memory Map implementation that provides per-WS-session continuity within a single process lifetime. Production deployments need a Postgres-backed adapter so memory survives runtime restarts and scales across replicas. Deferred until CI/Docker infra for DB integration tests is in place.

### [2026-05-06] ClickHouse-backed eval and churn-signal persistence
**Source:** Phase 2.5–2.6: `KeyValueEvalProvider` and `KeyValueChurnRiskProvider` are in-memory stubs; per ADR-008 and ADR-032 ClickHouse is the intended store.
**Category:** capability
**Notes:** Both providers use in-memory Maps. Real ClickHouse-backed implementations needed for: (a) eval signal persistence across restarts, (b) time-windowed aggregation for churn risk scoring, (c) eval dashboard data feeds, (d) VoC analytics pipeline. Deferred until CI/Docker infra is established for ClickHouse integration tests.

### [2026-05-06] Real LightGBM churn model training pipeline
**Source:** Phase 2.6 ships a heuristic ratio-based `ChurnRiskProvider`; per ADR-031 LightGBM with generic-prior cold-start is the real target.
**Category:** capability
**Notes:** Current implementation computes churn risk as a ratio of negative-to-total eval signals in a session window — a lightweight proxy. The real pipeline (ADR-031) needs: (1) feature engineering from stored interaction profiles + VoC signals, (2) LightGBM model training with SHAP explainability, (3) pluggable adapter contract for hosts with existing churn models, (4) generic-prior cold-start from synthetic e-commerce-like signals. Depends on ClickHouse persistence being in place first.
