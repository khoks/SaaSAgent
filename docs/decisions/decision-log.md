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

## ADR-013 — Feature/Service docs are agent-readable super-skill documents (NO compilation step)
- **Date:** 2026-04-28
- **Status:** accepted (resolves the open sub-question of ADR-011)
- **Context:** ADR-011 picked `.feature.md` (Markdown + YAML frontmatter + inline JSON) as the doc format but left open *when* NL gets compiled to typed JSON. Rahul reframed the premise: should the agent platform compile at all, or just read the doc as-is and execute it intelligently — the way Claude / Claude Code skills work?
- **Options considered:**
  - A. Compile NL → typed JSON at registration time (predictable runtime, slower author iteration).
  - B. Compile NL → typed JSON at runtime (flexible, more model spend).
  - C. **No compilation. The agent reads `.feature.md` files directly as planner context — they are super-skill documents, treated as soft hints rather than executable workflows.** Inline JSON is used only for parts that MUST be runtime-typed (preconditions evaluated programmatically, registry IDs for skills/tools/sub-agents/atomic components — these are validated at registration time).
- **Decision:** C.
- **Consequences:**
  - Eliminates an entire compiler subsystem — substantial complexity reduction.
  - Aligns with the proven Claude-skill / Claude-Code-skill design pattern — same authoring ergonomics.
  - Domain devs author in pure NL with optional typed escape hatches; iteration loop is fast (no recompile).
  - Trade: per-turn model spend increases marginally (planner consumes the relevant feature docs in context). Mitigated by **prompt caching** (docs are stable; cache hit on every invocation after the first).
  - Validation at registration time: typed-JSON portions checked for referential integrity (skill IDs, component IDs, etc.).
  - Resolves ADR-011's open sub-question (compilation timing → no compilation).
- **Novelty:** medium-high — most workflow systems require compiled definitions (Temporal, Airflow, BPMN). Treating workflow docs as soft prompts to an agent is the AI-native model and uncommon as a packaged design. Captured in [novel-ideas/ideas.md](../novel-ideas/ideas.md) (refines existing Feature/Service entry).
- **Source:** Conversation 2026-04-28 (Rahul Q3.1 answer).

## ADR-014 — Stream processing: Redpanda from MVP
- **Date:** 2026-04-28
- **Status:** accepted
- **Context:** Memory derivation pipeline (ADR-008) needs a stream backbone. Trade-off: in-process simplicity at MVP vs. real stream-native infra from day 1.
- **Options considered:**
  - A. In-process worker pool + cron at MVP, swap to Redpanda at v1.
  - B. **Redpanda from MVP** (Kafka-compatible, single binary, lighter ops than Kafka).
  - C. Kafka (heavier ops; KRaft/ZK complexity).
  - D. Temporal (workflow durability — overkill for stream derivation).
- **Decision:** B.
- **Consequences:**
  - MVP ops surface = PG + Qdrant + **Redpanda** + agent runtime (4 systems, up from the 3 that in-process would have given).
  - Avoids the v1 migration cost; stream-native semantics from day 1 (back-pressure, replay, partitioning, consumer groups).
  - Acceptable footprint — Redpanda is single-binary, no JVM, modest resource needs.
  - Pluggable adapter so enterprises with existing Kafka can swap.
- **Source:** Conversation 2026-04-28 (Rahul Q3.3 answer).

## ADR-015 — MVP framework scope: React + vanilla Web Components only
- **Date:** 2026-04-28
- **Status:** accepted (resolves the open sub-question of ADR-010)
- **Context:** ADR-010 picked WC-wrap-default + native-renderer escape hatch but left open which frameworks the multi-framework registry actually supports at MVP.
- **Options considered:**
  - A. **React + vanilla WC only at MVP**, defer Vue/Svelte/Angular to v1.5.
  - B. All four frameworks + WC from day one.
  - C. React + Vue + WC, defer Svelte/Angular.
- **Decision:** A.
- **Consequences:**
  - Multi-framework runtime is lighter at MVP (one framework runtime + WC).
  - E-commerce design partners (Walmart / Best Buy / Shopify-merchant-tier) are React-heavy — MVP scope matches.
  - Adapter contracts designed multi-framework so v1.5 additions (Vue / Svelte / Angular) are additive, not re-architectural.
- **Source:** Conversation 2026-04-28 (Rahul Q3.2 answer).

## ADR-016 — Voice-of-Customer: multi-surface outbound + closed-loop reprocessing into agent decision-making
- **Date:** 2026-04-28
- **Status:** accepted
- **Context:** Q3.4 — where do VoC signals (pain points, capability requests, friction patterns) go? Rahul expanded scope: VoC must also feed *back into* the agent platform itself.
- **Options considered:**
  - A. Single surface (dashboard).
  - B. Webhook to host's existing system (Linear/Jira/GitHub Issues).
  - C. Slack / email digest.
  - D. Auto-PR with suggested issues/tickets in host repo.
  - E. **All-of-above as configurable surfaces, with sensible defaults.**
- **Decision:** E for outbound. **Plus — VoC signals also flow back INTO the agent platform** as: (1) updates to customer interaction profile, (2) inputs to a new **Customer Churn ML Model**, (3) product improvement opportunity tracker (Jira/Linear/GitHub Issues integration via the auto-PR/webhook surface).
- **Consequences:**
  - **Outbound surfaces:** dashboard + webhook + Slack/email digest + auto-PR all available; default-on for MVP demo: weekly Slack digest + embedded dashboard. Webhook + auto-PR opt-in.
  - **New first-class component: Customer Churn ML Model** (per-tenant; lives inside enterprise data plane per ADR-006). Inputs: customer interaction profile + recent VoC signals + usage trajectory + feature exposure history. Output: P(churn | customer, feature). Used by the planner/composer at decision time to **avoid surfacing features that have caused friction for similar customers** ("don't propose feature X to customer Y if customers like Y consistently churn after X").
  - **VoC reprocessing pipeline** updates customer interaction profile with extracted pain points and friction patterns (FR-MEM-003).
  - **Closed-loop architecture**: agent observes → VoC extracts → churn model updates → planner consumes prediction → recommendation adapts. Self-correcting at the feature-recommendation level.
  - Default churn model bundled with platform; pluggable adapter so enterprises with existing churn models can substitute theirs.
- **Novelty:** HIGH — the closed-loop VoC → churn model → agent decision adjustment is uncommon as a packaged design. Auto-PR for product issues from agent observations is also distinctively novel. Both captured in [novel-ideas/ideas.md](../novel-ideas/ideas.md).
- **Source:** Conversation 2026-04-28 (Rahul Q3.4 answer).

## ADR-017 — Mobile embedding: WebView bridge with mobile-context-aware composition
- **Date:** 2026-04-28
- **Status:** accepted
- **Context:** Q3.5 — the platform must work in mobile contexts (Adobe / Canva / Expedia / Best Buy / Walmart / Shopify all have native mobile apps).
- **Options considered:**
  - A. React Native SDK only.
  - B. Native SDKs (iOS Swift + Android Kotlin) only.
  - C. **WebView bridge with thin native shim per platform; agent runtime is mobile-context-aware**.
  - D. Hybrid: WebView for MVP + native SDKs at v1.5 (specialization of C).
- **Decision:** C (with v1.5 native SDKs deferred per D).
- **Consequences:**
  - Single codebase across web + mobile. Reuses the WC shell.
  - Thin native shim per platform handles: launching the agent, providing app-screen state to the runtime, routing native events (microphone, push notifications, biometrics).
  - **Composer is mobile-context-aware**: at runtime the composer knows whether it's on mobile / tablet / desktop, screen size, touch vs. pointer, network class — and adapts composition (atomic component selection, layout density, text length, touch-target sizes, side-panel vs. bottom-sheet).
  - Atomic component registry may include mobile variants (e.g., `ProductTile.mobile`, `ProductTile.desktop`).
  - v1.5: native SDKs (iOS / Android) for hosts who need full native UX.
- **Source:** Conversation 2026-04-28 (Rahul Q3.5 answer).

## ADR-018 — Proactive engine: multi-signal confidence scoring + combined attention budget
- **Date:** 2026-04-28
- **Status:** accepted
- **Context:** Q3.6 (first part) — when does the agent pop up unprompted, and how often?
- **Options considered:** see Q3.6 framing in conversation.
- **Decision:**
  - **Confidence (trigger signal):** **multi-signal scoring at MVP** — planner confidence + memory match + workflow continuity + DOM-state relevance + time-since-last-interaction. v1: evolve to **learned trigger model** trained on accept/dismiss feedback once data accumulates.
  - **Attention budget:** **combined hard cap + token-bucket + per-user adaptation**. Defaults: max 2 unprompted per session, max 5 per day (host-configurable). Per-user adaptation closes the loop with the unified active+deduced feedback substrate (ADR-008) — users with high accept rates get a higher budget; users who dismiss frequently get a lower budget.
- **Consequences:**
  - Robust multi-signal triggering avoids LLM-confidence-score calibration issues.
  - Combined budget balances predictability (cap), natural cadence (bucket), and personalization (adaptation).
  - More to tune; mitigated by sensible defaults + host-configurable knobs.
  - Per-user adaptation depends on FR-FB (deduced feedback) being live — works even at MVP since active+deduced feedback is MVP scope.
- **Source:** Conversation 2026-04-28 (Rahul Q3.6 answer, first part).

## ADR-019 — End-user tier/quota system with visible request budgets
- **Date:** 2026-04-28
- **Status:** accepted
- **Context:** Q3.6 (second part) surfaced a separate concern: the host enterprise charges its OWN customers for SaaS access; agent usage should be tier-aware and the customer should see how many requests they have remaining.
- **Options considered:**
  - A. Platform doesn't model tiers; host bolts on its own metering.
  - B. **Platform supports configurable tiers + per-user quota tracking + quota-visibility surface for end-users**.
  - C. Platform fixes a tier model (inflexible).
- **Decision:** B.
- **Consequences:**
  - Per-user request and token tracking (lives in ClickHouse, telemetry-adjacent).
  - Per-user quota enforcement against host-configured tier limits (free / pro / enterprise / custom — host-defined).
  - End-user visibility: a composed UI element ("X requests remaining this period") rendered using host's atomic primitives + theme tokens, surfaced contextually (e.g., when nearing limit).
  - Quota enforcement modes per tier: hard limit / soft limit + warning / unlimited.
  - Unblocks the host's monetization model without forcing a specific pricing structure.
  - Distinct from the platform-vendor pricing (host pays platform vendor — separate concern, Batch 4).
- **Source:** Conversation 2026-04-28 (Rahul Q3.6 answer, second part).
