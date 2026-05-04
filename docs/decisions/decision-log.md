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

## ADR-020 — Open-core hybrid pricing: OSS substrate + paid Enterprise subscription + paid Capacity tiers unlocking high-novelty features
- **Date:** 2026-05-01
- **Status:** accepted
- **Context:** Q4.1 — under self-hosted distribution (ADR-006), how does the platform vendor get paid?
- **Options considered:**
  - A. Per-seat license.
  - B. Per-conversation.
  - C. Capacity tier only.
  - D. **Open-core hybrid: free OSS substrate + paid Enterprise subscription + paid Capacity tiers unlocking high-novelty features**.
  - E. Fully closed-source.
- **Decision:** D.
- **Consequences:**
  - **Tier 0 — Open-source substrate (free):** runtime, registries (Skills, Sub-Agents, Tools, Atomic UI Components, Theme tokens, Features/Services, Adapters), basic memory (Postgres + dev-default embeddings), planner + composer, WC shell, multi-framework rendering (React + WC at MVP), basic active feedback, basic eval dashboard. Self-deployable; community-supported. The OSS tier proves the substrate is real and drives adoption.
  - **Tier 1 — Enterprise subscription (paid; annual):** production-grade packaging (Helm chart, hardened defaults), security hardening, SLA, premium support, multi-region deployment, expanded eval, observability integrations.
  - **Tier 2 — Capacity tiers on Enterprise (paid; additive):** unlocks high-novelty features — closed-loop VoC + Customer Churn ML Model (ADR-016), federated cross-enterprise learning (Batch 5), advanced eval models, auto-PR with suggested issues, premium adapters (Salesforce / SAP / etc.). Capacity unit: monthly active end-users (MAU); host-configurable to alternative units (tokens, requests, concurrent sessions).
  - Open-core fits the "Stripe for in-product agents" ambition: adoption velocity matters more than per-deal margin in year 1; OSS-core is a community moat and talent magnet.
  - Risk: cannibalization on the paid tier — mitigated by clear separation of concerns (substrate is free; enterprise-grade ops + high-novelty features are paid).
  - Distinct from the **end-user** tier/quota system (ADR-019), which is the host's pricing for THEIR customers.
- **Source:** Conversation 2026-05-01 (Rahul Q4.1 answer).

## ADR-021 — Sub-agents are federated independent runtimes built by domain teams via the SDK; NOT in-process isolated workers
- **Date:** 2026-05-01
- **Status:** accepted (replaces the framing of original Q4.3 about isolation)
- **Context:** Q4.3 asked which isolation model to use for sub-agents (process / WASM / VM / iframe). Rahul reframed: sub-agents are not workers we host and isolate — they are **separate runtimes built by domain teams within the enterprise**, using boilerplate + SDK provided by the platform, federating into the platform via the Sub-Agent registry over a defined protocol. Isolation is by service/process/network boundary because they are separate services.
- **Options considered:**
  - A. Process isolation (separate OS proc within our platform).
  - B. WASM sandbox.
  - C. VM (Firecracker, gVisor).
  - D. Iframe (web-only).
  - E. **Federated independent runtimes** — sub-agents are separate services owned by domain teams; platform provides SDK + boilerplate + federation protocol + registry; sub-agents are isolated by virtue of being separate services.
- **Decision:** E.
- **Consequences:**
  - **Three-tier capability model crystallized:**
    - **Tools** — stateless API calls (HTTP) with input/output schemas; cheapest; planner-invoked directly.
    - **Skills** — lightweight in-process capabilities (functions, prompts, JSON-defined behavior); medium-weight; run inside the platform process.
    - **Sub-Agents** — full external runtimes with their own state, planning, memory, tools; heaviest; built by domain teams; federate into the platform.
  - **New deliverable: Sub-Agent SDK** in multiple languages (TS, Python, Go at minimum). SDK handles: registration, federation protocol, health checking, retries, circuit breaking, observability hooks, error semantics.
  - **New deliverable: Sub-Agent boilerplate templates** per language (one-command-create-a-sub-agent).
  - **New deliverable: Federation protocol spec** (gRPC vs. HTTP vs. WebSocket — Batch 5).
  - **Sub-Agent registry schema** must include: name, capabilities (semantic descriptions for planner + auto-eval), endpoint, auth, SLA, protocol version, health, owner team.
  - **Domain team velocity:** teams iterate on their sub-agents independently of the platform release cadence.
  - **Operational complexity:** sub-agents become independent deployable services that the host enterprise's infra teams must monitor.
  - **Cross-sub-agent orchestration** remains the platform's planner.
  - **Original Q4.3 isolation question moot at the platform level** — process isolation is automatic (separate services).
  - **Skills isolation** still relevant — handled by process isolation by default within the platform; WASM at v1 for adapter-supplied skill code.
- **Novelty:** medium-high — federated agent architecture with SDK-mediated registration is uncommon as a packaged primitive. Captured in [novel-ideas/ideas.md](../novel-ideas/ideas.md).
- **Source:** Conversation 2026-05-01 (Rahul Q4.3 answer — reframe).

## ADR-022 — DOM observation eventing: MutationObserver + IntersectionObserver + custom semantic event channel via separate Adapters registry
- **Date:** 2026-05-01
- **Status:** accepted
- **Context:** Q4.4 — how does the agent observe the host page (FR-I-001)?
- **Options considered:** see Q4.4 framing.
- **Decision:** **MutationObserver + IntersectionObserver + custom semantic event channel from the host**, with MO+IO-only fallback when the host doesn't emit custom events. Custom semantic event registration lives in a **separate Adapters registry** (not the Features/Services registry).
- **Consequences:**
  - DOM-level signals from MO/IO give universal coverage (works against any host page).
  - Domain-meaningful signals from host-emitted custom events (e.g., `cart.itemAdded`, `product.viewed`, `checkout.started`) give the agent semantic awareness DOM events alone don't carry.
  - **New first-class registry: Adapters registry** — declares: event channels (event name, payload JSON schema, source), data adapters (host APIs, customer profile store, usage profile store). Separate from Features/Services because event declarations are integration-level concerns; Feature/Service docs *reference* event names from the Adapters registry.
  - Event channel transport TBD (host event bus → adapter → platform internal Redpanda topic).
- **Source:** Conversation 2026-05-01 (Rahul Q4.4 answer + recommendation acceptance).

## ADR-023 — Hybrid eval with auto-generated per-skill / per-sub-agent eval from registry metadata, plus bundled eval backend + dashboard
- **Date:** 2026-05-01
- **Status:** accepted
- **Context:** Q4.5 — what does eval look like? Rahul accepted the hybrid scoring approach (heuristics + LLM-judge sampled + embedded models at v1) AND added two significant requirements: (a) auto-generated per-skill / per-sub-agent eval logic built on the fly from registry metadata, (b) eval backend + dashboard bundled in the package.
- **Options considered:**
  - A. Heuristics only.
  - B. LLM-as-judge only.
  - C. Embedded eval models only.
  - D. **Hybrid (heuristics + LLM-judge sampled + embedded at v1)** with **auto-generated per-capability eval from registry metadata** + bundled backend + dashboard.
- **Decision:** D.
- **Consequences:**
  - **Cross-cutting metrics (heuristics, every interaction):** latency, completion rate, cost per session.
  - **Quality metrics (LLM-as-judge, sampled ~5%):** groundedness, helpfulness, intent-alignment.
  - **Capability-specific eval (auto-generated):** for each registered skill / sub-agent, the eval system reads the registry entry's metadata (capability description, expected I/O schema, success criteria, examples) and **dynamically generates eval logic** for that capability. New capabilities get eval coverage automatically at registration.
  - **Bundled eval backend:** included in the OSS tier — storage (ClickHouse, see [memory.md](../architecture/memory.md)), scoring runners (heuristic + LLM-judge), regression detection, alerting hooks.
  - **Bundled eval dashboard:** included in the OSS tier — host's quality team sees per-skill / per-sub-agent / per-feature eval trends, regressions, sample interactions.
  - **Active+deduced feedback (FR-FB)** is the ground-truth anchor that calibrates auto-generated eval over time.
  - **Embedded eval models** (small dedicated scorers) added at v1 for the metrics that prove most decision-critical from MVP usage.
- **Novelty:** medium-high — auto-generated eval logic from capability registry metadata is uncommon. Captured in [novel-ideas/ideas.md](../novel-ideas/ideas.md).
- **Source:** Conversation 2026-05-01 (Rahul Q4.5 answer).

## ADR-024 — Embedding model: host-supplied via adapter (required for production); bundled default for development
- **Date:** 2026-05-01
- **Status:** accepted
- **Context:** Q4.6 — embedding model for Qdrant semantic recall.
- **Options considered:**
  - A. Anthropic embeddings (no first-party model currently).
  - B. OSS default (e.g., `nomic-embed-text-v1.5`).
  - C. **Host-supplied via adapter**.
- **Decision:** C — host-supplied is **required for production deployment**. A bundled OSS default (`nomic-embed-text-v1.5`) ships for **development / demo** so the OSS tier is usable end-to-end out of the box; production setup wizard prompts host to wire their own embedding pipeline.
- **Consequences:**
  - Adapter contract for embeddings: `embed(text: string | string[]) → vector | vector[]`.
  - Hosts with existing embedding pipelines (most large enterprises do) plug in directly — consistency with their other RAG / semantic-search stacks.
  - Hosts without existing pipelines can use the bundled default in dev, then choose a production option (nomic, BGE, OpenAI text-embedding-3, Anthropic when available, or roll their own).
  - Documentation will recommend popular options per use case.
  - Adoption friction for very small enterprises higher than a "just works" default — accepted in exchange for production correctness and host-pipeline consistency.
- **Source:** Conversation 2026-05-01 (Rahul Q4.6 answer).

## ADR-025 — Theme/branding tokens: W3C Design Tokens (DTCG) canonical schema + Style Dictionary importer + CSS variable fallback
- **Date:** 2026-05-01
- **Status:** accepted
- **Context:** Q4.7 — how does the host register their visual identity (per ADR-005, the agent composes UI using the host's tokens).
- **Options considered:** Style Dictionary, Spectrum, CSS variables, DTCG, custom DSL.
- **Decision:** **W3C Design Tokens (DTCG) as the canonical schema** the platform stores internally; **Style Dictionary as the default importer** (most token-using enterprises already use SD); **CSS variables accepted as a degraded path** (semantic info reduced). Future: Figma Tokens import.
- **Consequences:**
  - Single internal representation (DTCG) — composer queries one schema regardless of how the host authored.
  - Style Dictionary importer covers the majority of existing token pipelines.
  - CSS-variable fallback ensures the lowest-friction path for hosts without formal token systems.
  - DTCG is still finalizing — accept some spec churn in exchange for standards-alignment.
- **Source:** Conversation 2026-05-01 (Rahul Q4.7 answer + recommendation acceptance).

## ADR-026 — Distribution: Docker Compose (dev/demo) + Helm chart (prod) at MVP
- **Date:** 2026-05-04
- **Status:** accepted
- **Context:** Q5.1 — the platform is self-hosted (ADR-006), so we ship software the host runs.
- **Options considered:** Compose only / Helm only / Compose + Helm / standalone binary / OS installers.
- **Decision:** **Docker Compose for dev/demo + Helm chart for prod** at MVP. Standalone binary deferred (TS-leaning stack makes single-binary packaging complex). OS installers (apt/brew) deferred to v1.5 if demand emerges.
- **Consequences:**
  - Compose covers laptop / dev / demo and small production deployments.
  - Helm covers k8s — most enterprise production environments.
  - Two artifacts to maintain; mitigated by sharing the same container images underneath.
  - Reference deployment ships both; documentation guides which to use when.
- **Source:** Conversation 2026-05-04 (Rahul Q5.1 answer + recommendation acceptance).

## ADR-027 — Sub-Agent SDK languages at MVP: TypeScript + Python
- **Date:** 2026-05-04
- **Status:** accepted (refines ADR-021)
- **Context:** Q5.2 — ADR-021 requires multi-language SDK; which languages at MVP?
- **Options considered:** TS only / TS + Python / TS + Python + Go.
- **Decision:** **TypeScript + Python at MVP.** Go added at v1 if enterprise demand emerges.
- **Consequences:**
  - TS covers web-stack domain teams (most enterprise frontends).
  - Python covers ML / data / backend domain teams (where most real sub-agent use cases live — recommendation engines, churn predictors, content classifiers).
  - SDK contracts (registration, federation protocol, health, retries, observability) are identical across languages — same API surface in different idioms.
  - 2× SDK to maintain; mitigated by sharing protocol definitions (proto files for gRPC, JSON Schema for HTTP).
- **Source:** Conversation 2026-05-04 (Rahul Q5.2 answer).

## ADR-028 — Sub-Agent federation protocol: HTTP REST for admin/registry/metadata + gRPC bidirectional streaming for runtime
- **Date:** 2026-05-04
- **Status:** accepted (refines ADR-021)
- **Context:** Q5.3 — how do sub-agents communicate with the platform? Rahul confirmed the SPLIT (HTTP for admin, streaming for runtime) but left the specific streaming tech open.
- **Options considered:**
  - A. gRPC only (admin + runtime).
  - B. HTTP REST only (admin + runtime; runtime uses long-poll / SSE).
  - C. **HTTP REST for admin + gRPC bidirectional streaming for runtime**.
  - D. HTTP REST for admin + WebSocket for runtime.
  - E. HTTP REST for admin + SSE for runtime (one-way only).
- **Decision:** C. HTTP REST for: registration, health, registry queries, metadata fetch, lifecycle. **gRPC bidirectional streaming** for: planner ↔ sub-agent runtime invocation (planner sends task; sub-agent streams progress + intermediate results back).
- **Consequences:**
  - gRPC is the right tool for typed bidirectional streaming with multi-language SDK (TS + Python both have first-class gRPC support; proto files enforce contract).
  - HTTP REST keeps control-plane debuggable, curl-able, and standard.
  - Two transports to maintain; mitigated by clear separation (admin = HTTP, runtime = gRPC) and shared schema source.
  - Why gRPC over WebSocket: typed contracts (matters for multi-language SDK), proto-based versioning, streaming semantics built-in, HTTP/2 multiplexing.
  - Why not pure HTTP REST: bidirectional streaming for live progress is awkward over REST; SSE is one-way only.
- **Source:** Conversation 2026-05-04 (Rahul Q5.3 answer; specific streaming tech is platform-team recommendation).

## ADR-029 — Sub-Agent discovery + authn: push (self-register on startup) + mTLS, intranet trust model
- **Date:** 2026-05-04
- **Status:** accepted (refines ADR-021)
- **Context:** Q5.4 — how do sub-agents register and authenticate? Rahul: "Push for discovery, mTLS for auth since the SaaSAgent and other domain runtimes would be in the enterprise intranet."
- **Options considered:** see Q5.4 framing.
- **Decision:**
  - **Discovery: push** — sub-agents self-register with the Sub-Agent registry on startup, sending capability descriptors + endpoint + protocol version. Heartbeat + TTL for cleanup of dead entries.
  - **Authn: mTLS** for runtime traffic. **Trust boundary = enterprise intranet** — both the SaaSAgent platform and sub-agents live inside the enterprise's private network. mTLS via internal CA (cert-manager in k8s deployments).
  - **JWT** for non-runtime admin APIs (humans / ops tools calling the platform from outside the runtime data plane).
- **Consequences:**
  - Push registration matches modern microservice patterns (k8s + service mesh) — sub-agents are deployable units that announce themselves.
  - mTLS on intranet means no shared secrets in code / config; cert lifecycle managed by k8s cert-manager.
  - Intranet trust model assumes the host has secured the perimeter; documented as a deployment prerequisite.
  - Heartbeat protocol required so the registry can purge sub-agents that have crashed without graceful shutdown.
  - JWT tokens for admin APIs use platform-issued signing keys; rotation policy host-configurable.
- **Source:** Conversation 2026-05-04 (Rahul Q5.4 answer).

## ADR-030 — Eval dashboard: bundled SPA at MVP (React + chart lib); optional exporters at v1
- **Date:** 2026-05-04
- **Status:** accepted (refines ADR-023)
- **Context:** Q5.5 — ADR-023 commits to a bundled eval dashboard; tech?
- **Options considered:** bundled SPA / Grafana / custom + exporters.
- **Decision:** **Bundled SPA we build at MVP** — React + chart lib (Tremor or Recharts), embedded in the agent platform's admin UI. **Optional exporters at v1** to host's existing observability (Grafana, Datadog, Honeycomb) for hosts who want eval data flowing into their unified ops stack.
- **Consequences:**
  - MVP-bundled SPA gives end-to-end out-of-the-box eval visibility — host's quality team has somewhere to look on day 1.
  - SPA matches the platform's UX style; no Grafana ops dependency at MVP.
  - v1 exporters meet hosts in their existing observability stack — important for hosts who already standardize on Grafana / Datadog / Honeycomb.
  - SPA build cost; mitigated by leveraging the same atomic UI primitives + composer pattern used by the agent itself (dogfooding).
- **Source:** Conversation 2026-05-04 (Rahul Q5.5 answer + recommendation acceptance).

## ADR-031 — Customer Churn ML Model: LightGBM bundled default + pluggable adapter + generic-prior cold-start
- **Date:** 2026-05-04
- **Status:** accepted (refines ADR-016)
- **Context:** Q5.6 — ADR-016 introduces the Customer Churn ML Model as the closed-loop sink for VoC signals; what model architecture, what cold-start strategy?
- **Options considered:** GBT / small NN / ensemble / pluggable.
- **Decision:**
  - **Architecture: LightGBM bundled default + pluggable adapter** for hosts with sophisticated existing churn models.
  - **Cold-start: generic prior model** trained on synthetic e-commerce-like signals (anonymized industry patterns); transitions to tenant-specific model after threshold of real churn signals collected (initial threshold: ~1k events; tunable).
  - **Explainability:** every churn-driven feature suppression logs a rationale ("similar customers had X% churn after Y") — feeds FR-CHURN-008 and the auto-PR pipeline (ADR-016).
- **Consequences:**
  - LightGBM is industry-standard for tabular churn prediction: explainable (feature importances + SHAP), small (~MB), fast inference (<1ms), works with limited data.
  - Adapter contract lets enterprises with mature ML/CS teams swap in their own models (xgboost, deep learning, ensembles) without forking the platform.
  - Generic-prior cold-start avoids the "no predictions until real data accumulates" problem — closed-loop VoC works from day 1, just less personalized.
  - Synthetic prior training data needs careful curation to avoid biasing toward one industry — TBD as part of MVP build.
  - Explainability built-in (LightGBM SHAP / feature importances) — addresses regulatory and product-team-debugging needs.
- **Source:** Conversation 2026-05-04 (Rahul Q5.6 answer + recommendation acceptance).

## ADR-032 — Pull closed-loop VoC + Customer Churn ML Model forward into MVP (full polyglot stack from day 1)
- **Date:** 2026-05-07
- **Status:** accepted (supersedes the v1-deferral framing of ADR-016 and the MVP-subset framing of ADR-008)
- **Context:** When drafting INIT-002, surfaced a tension: the patentability-strong novel features (closed-loop VoC + churn model — ADR-016) were scoped to v1 per memory.md phasing AND paywalled per ADR-020, but they ARE the platform's marquee "wow" pitch. Asked Rahul to choose between (a) keep MVP substrate-only / closed-loop arrives v1, (b) pull closed-loop forward into MVP and accept ClickHouse + Neo4j ops cost from day 1, (c) build closed-loop for the demo only.
- **Options considered:** see Q3 of conversation 2026-05-07.
- **Decision:** **(b) Pull forward.** MVP includes the full polyglot memory stack (Postgres + Qdrant + ClickHouse + Neo4j + Redpanda) AND the closed-loop VoC pipeline AND the Customer Churn ML Model from day 1. Closed-loop VoC + churn become the marquee paid-tier demo from MVP launch.
- **Consequences:**
  - **MVP infrastructure footprint heavier** — 5 services to operate (was 3 in original plan): Postgres, Qdrant, Redpanda, ClickHouse, Neo4j. All in Docker Compose dev/demo + Helm for prod.
  - **Time-tiered summaries (session/day/week/month/year), VoC reprocessing, deduced feedback, churn model, eval analytics, agent self-telemetry** — all become MVP scope (were v1).
  - **Outbound VoC surfaces** — embedded dashboard + at minimum one push surface (Slack digest OR webhook) at MVP; auto-PR can stay v1 (richer feature requiring host-repo integration).
  - **Pricing model unchanged** ([ADR-020](#adr-020)) — closed-loop VoC + churn remain in the paid Capacity tiers; OSS substrate gets memory + Postgres/Qdrant + basic eval/dashboard, paid tier unlocks ClickHouse/Neo4j-backed features and the closed-loop pipeline.
  - **Memory architecture phasing updated** — see [memory.md](../architecture/memory.md): MVP phase now includes all 5 stores; v1 phase shrinks to "harden, scale, optimize"; v2 = federated learning.
  - The MVP can now demonstrate the patentability-strong loop end-to-end at launch — critical for design-partner conversations and for filing provisional patents (per ADR-035) on the proven, working system rather than a paper design.
- **Source:** Conversation 2026-05-07 (Rahul strategic Q3 answer = option b).

## ADR-033 — Anchor verticals: e-commerce + travel (Walmart/Best-Buy + Expedia/Booking composite archetype)
- **Date:** 2026-05-07
- **Status:** accepted (refines ADR-003)
- **Context:** ADR-003 picked e-commerce as the single MVP anchor vertical. When drafting INIT-002, asked Rahul whether to use a real partner or stay archetype-based; he answered "real partner is TBD, lets base it on both ecommerce and expedia like partner."
- **Options considered:** single vertical (e-commerce only) / dual vertical (e-commerce + travel) / multi-vertical.
- **Decision:** **Dual-vertical composite archetype** — Walmart-/Best-Buy-style e-commerce AND Expedia-/Booking-style travel. Real design partner remains TBD; Rahul to source.
- **Consequences:**
  - **Demo coverage broadens** — MVP demo script must cover BOTH a transactional flow (e-commerce: find-similar-product → cart → recovery) AND a multi-step planning flow (travel: trip planning → comparison → change/cancel).
  - **Atomic UI primitives broaden** — registry must include both e-commerce primitives (ProductTile, Cart, ComparisonGrid) and travel primitives (FlightCard, ItineraryTimeline, DateRangePicker, MultiCityRouteMap).
  - **Workflows broaden** — at least one Feature/Service doc per vertical (`find-similar-product.feature.md` for e-commerce; `plan-multi-city-trip.feature.md` for travel).
  - **Travel stress-tests the orchestrator** — multi-step planning (search → compare → select → book → modify) is naturally agent-shaped and the harder demo for proving the substrate's planning depth.
  - **E-commerce stress-tests the proactive engine** — cart abandonment + cross-session re-engagement is the highest-conversion proactive pattern.
  - **Trade-off:** more MVP build cost (two demo verticals instead of one). Justified because it proves vertical-agnosticism — the substrate works for both transactional AND multi-step-planning surfaces.
- **Source:** Conversation 2026-05-07 (Rahul strategic Q1 answer).

## ADR-034 — "Wow" target reframed: the agent IS the primary interaction surface; host UI becomes admin/troubleshooting/legacy
- **Date:** 2026-05-07
- **Status:** accepted (sets the experience bar for the platform)
- **Context:** Asked Rahul what should be the "wow" beat of the MVP demo. He answered: "The wow beat should be that the customer/user online who is using this SaaSAgent within the interface of the enterprise should feel that all the functionality which they want to execute is just a few sentences away, and its not clumsy, very intuitive, not limited, helps build muscle memory as well, and that the main enterprise interface like the website or mobile interface is just there for troubleshooting or admin functionality or for legacy support."
- **Options considered:** Various candidate "wow" beats — proactive re-engagement, eval dashboard, mobile parity, hot-reload.
- **Decision:** **The wow target is the experience, not a single beat.** The bar is: a returning user finds it strictly faster, more intuitive, and less limiting to accomplish their goal through the agent than through the host's existing UI. The host's UI persists as a fallback for: (a) admin tasks (settings, account management, billing), (b) troubleshooting (when something goes wrong), (c) legacy support (users who haven't transitioned).
- **Consequences:**
  - **Massively raises the substrate's experience bar** — the agent must cover the host's most common workflows fluently, not just one demo flow.
  - **MVP demo script must demonstrate this** — show a returning user accomplishing a complete transaction (e-commerce: discover → compare → buy; travel: plan → book → modify) entirely through the agent, faster than they could through the host UI.
  - **"Build muscle memory"** is a key phrase: the agent's interaction patterns must be predictable, repeatable, and rewarding so users learn them and return to them. Implies stable phrasing, consistent widget composition for the same intents, and a sense of progress within multi-turn workflows.
  - **"Not limited"** rules out heavy guardrails or scope-restrictions that frustrate power users — the agent must be capable of executing the full surface area of the host's product, not a curated subset.
  - **Strategic positioning consequence:** the platform's value prop to host enterprises isn't "add an AI helper" — it's "your agent will become how your customers do business with you; your existing UI becomes the support channel." This is a much more ambitious pitch and a much bigger commitment from the host.
  - **MVP acceptance criterion added:** during a structured user-test session, at least 7 of 10 testers complete a target workflow strictly faster through the agent than through the host UI on a second attempt.
- **Source:** Conversation 2026-05-07 (Rahul strategic Q2 answer).

## ADR-035 — License = Apache 2.0; provisional patents filed BEFORE OSS publication for high-novelty entries
- **Date:** 2026-05-07
- **Status:** accepted
- **Context:** Asked Rahul about OSS license; he answered "Make sure that we can file patents later, otherwise I don't care."
- **Options considered:** MIT / Apache 2.0 / AGPL / BSL.
- **Decision:**
  - **License: Apache 2.0.** Permissive enough for enterprise adoption; explicit patent grant from contributors (protects us from contributor patent attacks); standard for enterprise OSS infrastructure (k8s, Cassandra, Spark, …).
  - **Patent sequencing:** before any code reaches the public OSS repo, file **provisional patent applications** for the patentability-strong novel-idea entries. Specifically:
    - ADR-005 + entry "Runtime LLM composition of UI from host's atomic design-system primitives" (patentability: strong)
    - ADR-016 + entry "Closed-loop VoC → customer churn ML model → agent self-correction" (patentability: strong)
    - ADR-021 + entry "Federated sub-agent architecture" (patentability: possible)
    - ADR-023 + entry "Auto-generated per-capability eval logic from registry metadata" (patentability: possible)
    - Bidirectional widget→instruction loop (patentability: possible)
  - **Process:** during MVP build, develop in private GitHub repo (already private). File provisional patents when each component reaches working-prototype state (≥1 year of priority date locked in). Then make repo public + publish under Apache 2.0.
- **Consequences:**
  - **Repo stays private until provisional patents filed** — current `khoks/SaaSAgent` is already private, status quo.
  - **Working prototype required before filing** — provisional applications need a real description of the working system, not just design docs (improves patent strength). Patent filing therefore becomes a Phase 9 (release) gate.
  - **Apache 2.0 is the only viable permissive license that combines patent grant with broad enterprise adoption** — MIT lacks the patent grant; AGPL/BSL would limit adoption.
  - **Trademark/branding** to register separately (the platform name once finalized).
  - **Cost:** provisional patent filings ~$2-5k each via patent attorney. Budget separately.
- **Source:** Conversation 2026-05-07 (Rahul strategic Q6 answer).

## ADR-036 — Build team: Rahul + Claude only; phasing reflects 2-builder reality
- **Date:** 2026-05-07
- **Status:** accepted
- **Context:** Asked Rahul whether to put team-size assumptions in INIT-002. He answered: "No need to figure out team sizes, you and I will build this ourselves."
- **Options considered:** N/A (factual decision about team).
- **Decision:** **Build team = Rahul (PM + Engineer) + Claude (AI engineer).** No external hires for MVP.
- **Consequences:**
  - **Realistic MVP timeline is months, not weeks.** With one human + one AI, the human's review/decision/integration bandwidth is the bottleneck, not Claude's code generation rate.
  - **Phasing in INIT-003 must respect this** — sequential more often than parallel; minimize context-switching across phases.
  - **Scope discipline matters more than ever** — every scope-creep request costs both of us serial weeks. INIT-002's scope-out and anti-scope sections are now load-bearing protections.
  - **Recommendation: run with the full INIT-002 scope but in a "MVP-of-MVP" first** — get an end-to-end vertical slice working (one feature, one composed UI, one Sub-Agent, one workflow, no proactive, no mobile, no eval dashboard) before fanning out into full scope. Then expand. This is captured as Phase 0+1+2 in INIT-003 (foundation + composition + planning) — the rest builds on the working slice.
  - **Tooling investment pays off disproportionately** — strong CI, strong types, strong tests, fast local dev loop. The Claude-Code-skill automation already in this repo is one example of that investment.
- **Source:** Conversation 2026-05-07 (Rahul strategic Q5 answer).

## ADR-037 — Monorepo tooling: pnpm workspaces + Turborepo
- **Date:** 2026-05-07
- **Status:** accepted (provisional default; can override if Rahul prefers different)
- **Context:** Phase 0 scaffolding requires a monorepo to host multiple packages: runtime, TS SDK, web shell, CLI (and Python SDK as cross-language sibling).
- **Options considered:**
  - A. pnpm workspaces (no orchestrator).
  - B. **pnpm workspaces + Turborepo**.
  - C. Yarn workspaces + Turborepo / Nx.
  - D. Nx (heavyweight; opinionated).
  - E. Bun workspaces (newest; some ecosystem gaps).
- **Decision:** B. pnpm workspaces (fast, content-addressable, modern) + Turborepo (caching, task graph, Vercel-backed, well-documented).
- **Consequences:**
  - Standard modern TS monorepo setup; broad community familiarity.
  - Fast incremental builds via Turbo's task graph + remote cache option.
  - Python SDK lives in `packages/sdk-py/` as a sibling (Python tooling — uv or poetry — orthogonal to the JS workspace).
  - If Rahul prefers a different stack (Nx for heavier orchestration; Bun for speed), we can swap before too much code accumulates.
- **Source:** Conversation 2026-05-07 (Phase 0 scaffolding default).

## ADR-038 — Real-time transport: SSE for streaming planner output to shell + WebSocket for bidirectional instruction emit
- **Date:** 2026-05-08
- **Status:** accepted (closes Q6.3)
- **Context:** The Web Component shell needs a real-time channel to the runtime: planner streams composed UI updates + status to the shell as it generates them, and the shell streams typed-JSON interaction emits back as the user clicks/types/hovers (per ADR-005 + ADR-013).
- **Options considered:**
  - A. WebSocket only (bidirectional single channel).
  - B. SSE only (server→client; client uses HTTP POST for emits).
  - C. **SSE for streaming planner output + WebSocket for bidirectional emit (split channels)**.
  - D. WebRTC (over-engineered for the chat surface; reserved for voice in Phase 5).
  - E. HTTP/2 Server Push (legacy / unreliable browser support).
- **Decision:** C.
- **Consequences:**
  - **SSE channel** (server → shell): planner streams composed layout updates (typed JSON `LayoutTree` deltas), status events, narration text. SSE has native reconnect/Last-Event-ID semantics — robust against network blips. Simpler one-way contract.
  - **WebSocket channel** (shell ↔ runtime): user interaction emits flow as `InstructionEnvelope` messages from shell; runtime can also push live control messages (cancel composition, switch render mode, force re-render) when bidirectionality is needed.
  - **2 transports to operate, 2 to test** — mitigated by the clean concern split (SSE = output stream, WS = interaction RPC).
  - **Both endpoints share auth** (host SSO token from initial connect handshake).
  - **WebRTC reserved for voice (Phase 5)** when microphone capture and TTS narration land; voice has different latency / codec characteristics that warrant a third channel.
  - Native browser support for both is universal; no polyfills required.
- **Source:** Conversation 2026-05-08 (Rahul Q6.3 confirmation of MVP default proposal).
