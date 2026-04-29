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

## ADR-008 — Polyglot memory architecture (Postgres + Qdrant + ClickHouse + Neo4j), phased
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Memory must support: (1) forever-immutable raw interaction storage; (2) continuous derivation of customer interaction / SaaS-usage / SaaS-domain profiles; (3) workflow progress tracking with resumability; (4) per-session / day / week / month / year summaries; (5) intra-tenant cross-customer problem-solution KB; (6) product-team-facing pain-point + recommendation extraction (voice-of-customer); (7) live + offline eval datapoints; (8) agent self-telemetry; (9) active and deduced feedback driving both eval and personalization. Constraint: enterprise self-hosts (ADR-006), so stores must be embeddable + pluggable.
- **Options considered:**
  - A. Single embedded vector DB (Chroma/Qdrant local) — simple ops, loses time-window queries.
  - B. Postgres + pgvector + KG-as-relations — single ops surface, weaker on each axis vs. specialized stores.
  - C. **Polyglot — Postgres + Qdrant + ClickHouse + Neo4j** — each store optimized for its purpose.
  - D. Custom AI-native tiered store from day one — high-novelty, high-build-cost, high-risk.
- **Decision:** C, **phased**. **MVP = Postgres + Qdrant only** (raw log, workflow state, basic profiles, active feedback, semantic recall). **v1 adds ClickHouse + Neo4j** (time-tiered summaries, problem-solution graph, eval, telemetry, deduced feedback, voice-of-customer). v2 = federated learning state (opt-in cross-enterprise).
- **Consequences:**
  - MVP ops surface stays at 2 systems; v1 grows to 4. Reference deployment ships all four (Docker compose / Helm).
  - Each store earns its slot: PG (truth + structured profiles + workflow), Qdrant (semantic recall), ClickHouse (time-tiered summaries + eval + telemetry + VoC analytics), Neo4j (problem-solution graph + VoC relations).
  - All stores behind adapter interfaces; enterprises can swap defaults to Pinecone / Weaviate / Snowflake / BigQuery / etc.
  - Continuous derivation pipeline reads from PG raw log → writes to derived stores. Stream-processing tech is a separate decision (Batch 3).
  - Source-of-truth invariant: all derived stores can be rebuilt from PG raw log.
  - "Cross-customer" = intra-tenant (across the enterprise's user base); never cross-enterprise per ADR-006.
- **Novelty:** medium-high — see novel-ideas entries on (a) in-product self-improving problem-solution graph, (b) agent as voice-of-customer pipeline, (c) unified active+deduced feedback substrate.
- **See:** [docs/architecture/memory.md](../architecture/memory.md) for the full layout.
- **Source:** Conversation 2026-04-26 (Rahul Q6 answer).

## ADR-009 — Hybrid DS-registration: manual JSON + Storybook auto-extract + component-metadata extract + manual augmentation layer
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Domain devs need flexible paths to register the host's atomic design-system primitives. Hosts vary in tooling maturity (some have full Storybook, some have only TS types, some have neither).
- **Options considered:**
  - A. Manual JSON entries only — explicit, high friction.
  - B. Storybook auto-extract only — fast for Storybook-using hosts; locks out the rest.
  - C. Component metadata extract only — works without Storybook; lower-quality semantic data.
  - D. **Hybrid: all three intake paths + manual augmentation layer for LLM semantics**.
- **Decision:** D.
- **Consequences:**
  - All three paths coexist; all normalize to the same internal registry schema.
  - Manual augmentation layer carries LLM-friendly semantics (semantic role, when-to-use examples, composition constraints, accessibility hints) — itself a small but novel translation surface between a design system and an LLM's understanding.
  - More integration code to maintain; mitigated by having a single normalized internal registry.
- **Source:** Conversation 2026-04-26 (Rahul Q7 answer).

## ADR-010 — Multi-framework rendering: WC-wrap by default + native-renderer escape hatch
- **Date:** 2026-04-26
- **Status:** accepted (MVP framework scope still open)
- **Context:** ADR-004 commits to a multi-framework component registry. How do we actually render React + Vue + Svelte + Angular + vanilla WC components in one shell?
- **Options considered:**
  - A. Custom-element wrap each framework (Lit/Stencil/per-framework wrappers) — single render API; some perf hit.
  - B. Module Federation per framework — native lifecycle + perf; multiple framework runtimes loaded per page (heavy).
  - C. Per-framework universal renderer adapter — flexible; most code to maintain.
  - D. **Hybrid: WC-wrap by default + native-renderer escape hatch for performance-critical primitives**.
- **Decision:** D.
- **Consequences:**
  - Lightest default footprint (no all-frameworks-loaded baseline).
  - Performance escape hatch when needed (large lists, complex animations, intricate state).
  - Two render paths to debug; mitigated by the WC-wrap path being the default 80% case.
  - **Open: MVP framework scope** — should MVP support React + vanilla WC only and defer Vue/Svelte/Angular to v1.5? (Batch 3 follow-up.)
- **Source:** Conversation 2026-04-26 (Rahul Q8 answer).

## ADR-011 — Feature/Service docs as `.feature.md` (Markdown + YAML frontmatter + inline JSON)
- **Date:** 2026-04-26
- **Status:** accepted (NL→JSON compilation timing still open)
- **Context:** Domain devs author Feature/Service workflow declarations. Format choice locks in DX, parsability, LLM-readability, git-diff-ability.
- **Options considered:**
  - A. Pure YAML.
  - B. Pure JSON.
  - C. **Markdown + YAML frontmatter (id, name, version, owner, preconditions) + NL-first body + optional inline JSON code blocks for typed steps**.
- **Decision:** C. File extension `.feature.md` (or `.service.md`).
- **Consequences:**
  - LLM-friendly (NL body) + human-friendly (Markdown rendering) + git-friendly (diffable text).
  - Parser must compile NL → typed JSON for runtime consumption.
  - Matches the Claude-skill authoring pattern (familiar to anyone using Claude Code).
  - **Open: compilation timing** — at registration time (pre-compiled, fast at runtime, predictable, slower author iteration) vs. at runtime (always re-interpreted, more flexible, more model spend). My recommendation: registration-time with re-compile on doc change. Pending Rahul's confirmation in Batch 3.
- **Source:** Conversation 2026-04-26 (Rahul Q10 answer, sub-question (a) only).

## ADR-012 — UI Composer: Haiku + cached layout templates per intent + Sonnet fallback
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** UI composition is a per-turn structured-output task (more if user interactions cascade). Cost and latency stack across turns; need a strategy that doesn't scale linearly with usage.
- **Options considered:**
  - A. Same model as planner (Sonnet) — best quality, costliest, latency stacks.
  - B. Smaller model (Haiku) end-to-end — fast/cheap, may miss subtle composition.
  - C. **Haiku composer + cached layout templates per canonical intent + Sonnet fallback for novel intents**.
  - D. Fine-tuned model — optimal but brittle to design-system changes.
- **Decision:** C. Sonnet remains the planner.
- **Consequences:**
  - Best amortized cost on common e-commerce flows (product comparison, cart review, returns, recommendations).
  - Cache invalidation strategy needed (DS version change, theme token change, Feature/Service doc edit → invalidate affected templates).
  - Cold-start cases use Sonnet — slightly slower first paint for novel intents, acceptable tradeoff.
  - Cached templates are themselves typed-JSON layout trees keyed by canonical intent — supports the bidirectional-emit patentability story.
- **Source:** Conversation 2026-04-26 (Rahul Q14 answer).
