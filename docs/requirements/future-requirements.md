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

### [2026-05-01] Go SDK for sub-agent development (v1 target)
**Source:** ADR-027 and INIT-002 scope-out: "Go added at v1 if enterprise demand emerges."
**Category:** capability
**Notes:** Sub-Agent SDK ships TypeScript + Python at MVP. Go is explicitly deferred to v1 when demand from data-engineering or infrastructure teams emerges. The gRPC/protobuf federation protocol spec is defined at MVP so a Go SDK is straightforward to add without protocol changes.

### [2026-05-01] OS package installers and standalone binary (v1.5 target)
**Source:** ADR-026 and INIT-002 scope-out: "OS installers (apt/brew) deferred to v1.5 if demand emerges. Standalone binary deferred (TS-leaning stack makes single-binary packaging complex)."
**Category:** capability
**Notes:** Platform distributes as Docker Compose (dev/demo) + Helm chart (prod) at MVP. OS installers (deb/rpm/brew) and a standalone binary are deferred to v1.5 if enterprise procurement workflows or developer ergonomics demand it.

### [2026-05-01] Observability exporters for eval data (v1 target)
**Source:** ADR-030 and INIT-002 scope-out: "Optional exporters at v1 to host's existing observability (Grafana, Datadog, Honeycomb) for hosts who want eval data flowing into their unified ops stack."
**Category:** integration
**Notes:** Bundled eval SPA ships in the OSS tier at MVP. At v1, optional exporters push eval metrics/traces into the enterprise's existing observability stack via OpenTelemetry. Enables SRE/NOC teams to correlate agent quality regressions with infra events in their existing panes of glass.

### [2026-05-01] Learned proactive trigger model (v1 target)
**Source:** ADR-018 and INIT-002 scope-out: "Learned proactive trigger model — multi-signal heuristic at MVP; needs MVP feedback data first."
**Category:** capability
**Notes:** Multi-signal scoring (planner confidence + memory match + workflow continuity + DOM relevance + time-since) is the MVP trigger. v1 evolves this to a learned model trained on accept/dismiss feedback once sufficient data accumulates from MVP deployments.

### [2026-05-01] Per-user attention-budget adaptation (v1 target)
**Source:** ADR-018 and INIT-002 scope-out: "Per-user attention-budget adaptation — hard-cap only at MVP."
**Category:** capability / personalization
**Notes:** Hard cap (max 2 unprompted/session, max 5/day) is the MVP model. v1 adds per-user adaptation: users with high accept rates get a higher budget; high dismiss rates → lower budget. Depends on the unified active+deduced feedback substrate being live.

### [2026-05-01] WASM skill isolation for adapter-supplied code (v1 target)
**Source:** ADR-021 derivative and INIT-002 scope-out: "WASM skill isolation — process isolation only at MVP."
**Category:** capability / security
**Notes:** Skills run in-process at MVP (with process isolation by default). v1 adds WASM sandbox for adapter-supplied skill code from third-party or domain teams, providing stronger isolation without the overhead of a full subprocess.

### [2026-05-01] Drawer and ejectable-popout WC shell render modes (v1 target)
**Source:** INIT-002 scope-in notes: "full-page added if time; drawer + ejectable popout deferred to v1."
**Category:** capability / UX
**Notes:** MVP ships with side-panel render mode (plus full-page if time allows). Drawer (slide-up from bottom, common on mobile) and ejectable-popout (user detaches the panel into a floating window) are v1 UX modes.

### [2026-05-01] Vue / Svelte / Angular component registry support (v1.5 target)
**Source:** ADR-004, ADR-015, and INIT-002 scope-out: "Vue / Svelte / Angular registry support — React + WC sufficient for e-commerce MVP."
**Category:** integration
**Notes:** Multi-framework component registry supports React + vanilla Web Components at MVP. Vue, Svelte, and Angular adapter contracts are designed at MVP (additive, not re-architectural) so v1.5 additions are straightforward once demand from those framework communities materialises.
