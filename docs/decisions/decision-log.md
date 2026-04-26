# Decision Log (ADRs)

> Append-only chronological log of every load-bearing decision. The `extract-insights` skill auto-appends entries when conversations conclude with a decision.

## Format

```
## ADR-### — Title
- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded by ADR-### | deprecated
- **Context:** what problem we were solving / what was forcing the decision
- **Options considered:** A, B, C with one-line tradeoff each
- **Decision:** which option, and why
- **Consequences:** what this enables and what it costs
- **Source:** conversation snippet / link
```

---

## ADR-001 — Initialize project as a documentation-first grooming repo before any code
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Rahul wants to groom vision/requirements/architecture before building MVP.
- **Options considered:**
  - A. Start with code scaffold and groom alongside.
  - B. Documentation-first; build MVP only after vision is sharp.
- **Decision:** B. Documentation-first. PLOT.md, vision, requirements, architecture, decisions, novel-ideas, work tracking — all skeletoned upfront.
- **Consequences:** slower start to running code, but every line of code later traces to a groomed requirement and a recorded decision. Reduces re-architecting cost.
- **Source:** Initial conversation 2026-04-26.

## ADR-002 — Two project-local Claude skills wired via Stop hook
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Rahul wants automatic post-conversation extraction of insights and automatic work-tracking maintenance.
- **Options considered:**
  - A. Manual invocation by Rahul each time.
  - B. Stop-hook-driven automatic invocation of two skills (`extract-insights`, `work-management`).
  - C. Single skill that does both jobs.
- **Decision:** B. Two separate skills, both invoked by `Stop` hook. Separation keeps each skill's responsibility crisp and lets us iterate on them independently.
- **Consequences:** every `Stop` event now runs two skills, adding latency at session end. Acceptable for now; can be merged later if needed.
- **Source:** Initial conversation 2026-04-26.

## ADR-003 — E-commerce as MVP design-partner vertical
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Universal substrates die when they try to be universal on day one. We need one anchor vertical whose surface area defines the MVP.
- **Options considered:**
  - A. **E-commerce** (Walmart / Best Buy / Shopify-merchant-tier) — broad TAM, mature event-bus patterns, clearest ROI demo (cart abandonment, product discovery, returns/support).
  - B. **Travel** (Expedia / Booking) — most agent-native multi-step workflows; harder data model.
  - C. **Creative tools** (Adobe / Canva) — best multimodal-DOM showcase; harder embed surface.
  - D. **B2B SaaS productivity** (Notion / Asana-like) — best dev ergonomics; weaker wow factor.
- **Decision:** A. E-commerce. Lowest abstraction-leakage risk, broadest later-applicability, sharpest concrete-outcome demo.
- **Consequences:** MVP scope is shaped by e-commerce flows. Travel-style multi-step planning depth and creative-tools-style multimodal-DOM depth are deferred to v2 verticals. Long-term aspiration — a Google-app/OS-ecosystem-style universal agent surface — is captured as a future requirement.
- **Source:** Conversation 2026-04-26 (Rahul Q1 answer).

## ADR-004 — Web Component shell with multi-framework component registry
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** The embed surface choice determines what frameworks the host can keep using and how isolated the agent is from the host page.
- **Options considered:**
  - A. **Web Component shell only** (vanilla TS core, framework-agnostic; original recommendation).
  - B. **WC shell + per-framework SDK wrappers** (best DX, N versions to maintain).
  - C. **Iframe** (best isolation, worst DOM-observation UX).
  - D. **WC shell that hosts a multi-framework component registry inside it** — hosts can register components written in React / Vue / Svelte / Angular under one shell, with an integration framework for two-way interaction with the host's UI framework. (Rahul's expansion.)
- **Decision:** D. WC as the outer shell + multi-framework component registry inside.
- **Consequences:** WC remains framework-agnostic at the shell level so it survives the next framework cycle. The multi-framework registry is technically non-trivial — likely a combination of Module Federation, custom-element wrappers per framework, and a unified component-registration schema. Integration framework for host UI interop becomes a first-class deliverable. Iframe deferred to enterprise tier (if compliance ever requires it).
- **Source:** Conversation 2026-04-26 (Rahul Q2 answer).

## ADR-005 — UI is composed at runtime from the host's atomic design-system primitives
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** How does the agent render UI in its conversational pane? This is the architectural pillar that defines the platform's UX model and underwrites the patentability story.
- **Options considered:**
  - A. **Server-driven UI from a fixed widget catalog** (Anthropic-tool-use / Airbnb-Epoxy style; original recommendation). Closed catalog; agent picks from N pre-built cards.
  - B. **Shipped React components keyed by id+props** — open extensibility but versioning hell.
  - C. **Generative UI emitting raw HTML/CSS** — off-brand risk, unpredictable.
  - D. **Composition from the host's atomic design system** (Rahul's design): the host registers their atomic UI primitives (their UI foundation library) plus theme & branding tokens; the agent's UI vocabulary IS the host's design system; at runtime the agent composes final UI artifacts from these atomic primitives based on conversation context, memory, and Feature/Service hints; data wiring across composed components is agent-determined; the bidirectional emit remains typed JSON; domain-dev natural-language specs in Feature/Service docs are compiled to typed JSON internally.
- **Decision:** D.
- **Consequences:**
  - Output is **stylistically guaranteed on-brand by construction** (the agent can only compose from the host's primitives).
  - Requires three new schemas: atomic-component registration, theme/branding tokens, typed-JSON layout tree.
  - Adds a dedicated "UI Composer" LLM step in the runtime (could share or differ from the planner model).
  - Domain devs can author Feature/Service docs in NL or typed JSON; runtime compiles to JSON.
  - Versioning of registered components needs careful handling (host upgrades a primitive → composer must adapt).
- **Novelty:** high — packaged "AI runtime composition of UI from host design system" appears uncommon in the literature and in production. Captured in [docs/novel-ideas/ideas.md](../novel-ideas/ideas.md).
- **Source:** Conversation 2026-04-26 (Rahul Q3 answer — significant expansion of original proposal).

## ADR-006 — Self-hosted-only deployment within enterprise's ecosystem
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Where does the platform run, and who holds the data?
- **Options considered:**
  - A. Pure SaaS, pool tenancy.
  - B. SaaS control plane + per-tenant data plane (Snowflake-style).
  - C. **Self-hosted only** — the platform lives end-to-end inside the enterprise's ecosystem.
  - D. Stateless platform, host owns all stores via adapters.
- **Decision:** C. Self-hosted only.
- **Consequences:**
  - No multi-tenant cloud to operate; no platform-side compliance posture (each enterprise carries its own SOC2/GDPR/HIPAA).
  - Distribution is software-vendor model: versioned releases (Docker / Helm / standalone), enterprise-paced upgrades.
  - Pricing model is license / per-seat / capacity tier — not per-conversation/per-token.
  - No cross-tenant learning by default. Federated learning is a future opt-in capability.
  - Foundation-model access is via enterprise's own provider account (Anthropic API direct or via Bedrock/Vertex/Azure-hosted Claude).
  - Sacrificed: Stripe-like adoption velocity; product telemetry feedback loop; cross-customer network effects.
  - Gained: enterprise compliance compatibility, simpler trust story, faster enterprise sales cycle once established.
- **Source:** Conversation 2026-04-26 (Rahul Q4 answer).

## ADR-007 — Claude Agent SDK as v0 substrate, behind thin internal interface
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Build agent runtime ground-up vs. on existing framework?
- **Options considered:**
  - A. **Claude Agent SDK** — closest fit; Anthropic-native; faster to MVP; provider-coupling risk.
  - B. **LangGraph** — provider-agnostic; more boilerplate; mature observability; harder bidirectional widget loop.
  - C. **Bespoke** — total control; 3× the work; reinvent tracing/retries/parallel sub-agent execution.
- **Decision:** A. Claude Agent SDK at the substrate, behind a thin internal interface so the substrate model can be swapped if needed. Differentiation lives in the orchestrator / planner / thinker / **UI composer** layers we build on top.
- **Consequences:** 2–3 months saved on undifferentiated heavy lifting (sessions, tool use, memory primitives, streaming). Provider coupling at the substrate is acceptable given the self-hosted distribution model (enterprise can swap their Anthropic provider for Bedrock/Vertex without affecting our interface). Upgrade-path management for SDK changes is now an operational concern.
- **Source:** Conversation 2026-04-26 (Rahul Q5 answer).
