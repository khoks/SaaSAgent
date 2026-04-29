# Novel & Potentially Patentable Ideas

> Auto-maintained by the `extract-insights` skill. Every non-obvious or novel concept Rahul proposes lands here with date, source, and prior-art notes.

## Format

```
### [YYYY-MM-DD] Title of idea
- **Originator:** Rahul / Claude / joint
- **Source:** conversation snippet
- **Description:** 1–3 paragraph summary
- **Prior-art assessment:** known approaches and how this differs (best-effort)
- **Novelty signal:** low | medium | high — and why
- **Patentability hint:** none | possible | strong — and why
- **Open questions / next steps**
```

## Entries

### [2026-04-26] Universal SaaS-agnostic agentic harness as a substrate platform
- **Originator:** Rahul
- **Source:** Initial vision dump.
- **Description:** Rather than each SaaS hand-rolling its own AI assistant, a universal embeddable harness provides the entire agent substrate (orchestration, planning, thinking, memory, observation, multimodal I/O, proactive engine, registries) and lets the host plug in their own skills, sub-agents, tools, widgets, and feature/service workflows declaratively. The host enterprise writes no agent code — only registry entries and adapters.
- **Prior-art assessment:** Existing patterns include in-house assistants (Adobe Sensei, Shopify Sidekick), generic chatbot SDKs (Intercom, Drift), and LLM frameworks (LangChain, LangGraph). None combine: (a) embeddable shell with multi-mode UX, (b) registry-driven host extensibility for skills+sub-agents+tools+widgets+workflows, (c) cross-session AI-native memory, (d) DOM-aware observation, (e) proactive engine, in a single platform marketed as a substrate.
- **Novelty signal:** medium-high — the *combination* and the substrate framing appear novel even if individual ingredients are not.
- **Patentability hint:** possible — likely as a system claim covering the orchestration of these components, especially the widget→agentic-instruction loop and the declarative Feature/Service registry consumed by an LLM planner. Need formal prior-art search.
- **Open questions:** Which vertical do we land first? Does the platform name need to be neutral (not "SaaS Agent" forever)?

### [2026-04-26] Composed UI artifacts as bidirectional agentic instruction emitters
- **Originator:** Rahul (refined 2026-04-26 in Q3 answer)
- **Source:** "those widgets will ultimately give agentic instructions back to this agentic system so that it can think plan execute and then render the next set of conversational pieces or widgets" + "the bidirectional instruction emit can still be typed JSON, and the agentic harness of the SaaS Agent will indeed convert everything into this format, but it allows natural language specification if natural language is being used by the app/domain developers instead of strict JSON."
- **Description:** UI artifacts in the conversational pane are not passive output. Each composed artifact (built from the host's atomic design-system primitives — see entry below) is interaction-instrumented; user actions emit typed JSON instructions back into the orchestrator, which re-plans, asks the UI Composer for the next artifact, and renders it. The conversational pane is a closed agentic loop. Domain-dev specs in Feature/Service docs may be authored in natural language; the runtime compiles them to the same typed JSON protocol.
- **Prior-art assessment:** Most agent UIs treat widgets as terminal output (Claude artifacts, ChatGPT canvas) or as forms that submit back as text. The bidirectional, structured-instruction loop framed as a first-class protocol — and applied to **composed** artifacts rather than catalog-picked ones — is uncommon. Closest analogues: server-driven UI in mobile (Airbnb's GraphQL-driven UI), but those are not agent-coupled and not composed at runtime.
- **Novelty signal:** high.
- **Patentability hint:** possible — method claim covering the composed-artifact → typed-JSON-instruction → re-plan → next-composed-artifact loop in an embeddable agent context, with NL→JSON compilation of domain-dev specs.
- **Open questions:** Instruction schema design; causality tracking across the loop for memory; back-pressure when interactions arrive faster than the planner can respond.

### [2026-04-26] Runtime LLM composition of UI from host's atomic design-system primitives
- **Originator:** Rahul
- **Source:** Q3 answer 2026-04-26: "the Agent UI will compose final UI artifacts using smaller composable pre-registered widgets/components from the widget/component registry … so atomic/trivial that basically they will reflect the UI foundation library of the enterprise … The Enterprise will also register their themes and branding information with the agent, which will help the agent to understand how to compose the entperise's version of usable and stylistically compatible UI experiences in its scrolling interaface. Needless to say that the data wiring across these widghets/components once composed on the UI will be completely determined by the agent."
- **Description:** Instead of selecting from a fixed widget catalog (SDUI) or generating raw HTML/CSS (generative UI), the agent **composes** runtime UI artifacts from a registry of the host's **atomic design-system primitives** (their UI foundation library: Buttons, ProductTiles, Cards, Avatars, Skeletons, etc.) plus a registry of the host's **theme & branding tokens**. The agent's UI vocabulary IS the host's design system, so output is **stylistically guaranteed on-brand by construction** — there is no way for the agent to render off-brand UI because off-brand primitives don't exist in its vocabulary. Data wiring across composed primitives is agent-determined at runtime. Domain-dev Feature/Service docs may include UI experience hints in NL or typed JSON.
- **Prior-art assessment:**
  - **SDUI** (Airbnb Epoxy, Lyft SDUI, Anthropic tool-use widget pattern) selects whole pre-built cards from a server-defined catalog — not composition from atomic primitives.
  - **Vercel v0 / Anthropic artifacts** generate raw markup — not bound to a host design system.
  - **Storybook composition** is developer-time, not runtime.
  - **Headless CMS + component library** is content-author-driven, not LLM-driven.
  - **Galileo / Magic UI / generative-UI papers** generate raw markup.
  - The combination of (a) registering an atomic design system as the agent's UI vocabulary, (b) constraining LLM composition to that vocabulary, (c) data wiring at compose time, (d) hosting the registry inside an embeddable agent shell that operates in any enterprise's product — appears uncommon in production and unfamiliar in the literature.
- **Novelty signal:** **high** — the framing as "AI runtime composition engine constrained by the host's design system" is a distinctive design choice.
- **Patentability hint:** **strong** — system claim covering: (1) a registry of atomic UI primitives + theme/branding tokens belonging to a host application, (2) an LLM-driven composer that emits typed-JSON layout trees referencing those primitives based on conversation context and Feature/Service hints, (3) runtime mounting + data wiring of composed artifacts inside an embeddable shell, (4) bidirectional typed-JSON instruction emit from composed artifacts back to the planner. Recommend formal prior-art search before any disclosure.
- **Open questions:** Component registration schema (what does an "atomic primitive" entry look like)? How is the LLM constrained to compose only valid primitive arrangements? Does the composer use the same model as the planner or a smaller/cheaper model? How are composition templates cached for repeated intents? How does composition handle versioning when the host upgrades a primitive?

### [2026-04-26] In-product self-improving problem-solution knowledge graph
- **Originator:** Rahul
- **Source:** Q6 answer 2026-04-26: "I want it to extract the problems discussed and solutions given and generate a cross customer unique problem-solution database as well which will benefit everyone."
- **Description:** The agent continuously extracts (problem, solution, context, outcome) tuples from end-user interactions, semantically deduplicates them into canonical entries, and stores them in a knowledge graph organized by relations: problem ↔ solution ↔ feature ↔ pain-point ↔ user-type. The graph is queryable by the planner: when a new user arrives with a problem similar to one already in the graph, the agent can recall the canonical solution(s) and the contexts in which they worked. The graph improves itself with every interaction. **Intra-tenant only** (across the enterprise's own user base) per ADR-006 — never cross-enterprise.
- **Prior-art assessment:**
  - **Support BI tools** (Zendesk Explore, Intercom AI, etc.) generate aggregate analytics from conversations — offline, dashboard-facing, not agent-queryable.
  - **Help-center KBs** are manually authored or LLM-summarized in batch — not continuously distilled from live agent conversations.
  - **RAG over conversation history** is a primitive form of this idea but lacks the canonicalization, dedup, graph structuring, and outcome-tracking framing.
  - The combination of (a) live extraction from agent conversations, (b) semantic dedup into canonical entries, (c) graph-organized by problem/solution/feature/pain/user-type relations, (d) queryable by the same agent that produces the data, (e) intra-tenant scope, appears uncommon as a packaged primitive.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible — system claim covering: (1) continuous (problem, solution, context, outcome) extraction from agent-user interactions, (2) semantic deduplication into canonical entries, (3) multi-relation graph storage, (4) agent-queryable recall for new users with semantically similar problems, (5) intra-tenant scoping.
- **Open questions:** Extraction model (LLM-as-extractor — same as planner or dedicated)? Dedup similarity threshold? Outcome attribution when solutions are partially adopted? Graph schema versioning?

### [2026-04-26] Agent as continuous voice-of-customer pipeline for the host's product team
- **Originator:** Rahul
- **Source:** Q6 answer 2026-04-26: "I want it to extract product recommendations for the development team from the interactions and the product and feature pain points."
- **Description:** The agent observes end-user struggles, requests, and feedback in real conversations. A continuous extraction pipeline distills these into: feature pain points, requested capabilities, friction patterns, and prioritization signals (frequency, severity, customer-segment weighting). These flow to a product-team-facing surface (dashboard / feed / webhook / Slack-or-email digest / auto-PR — TBD). The agent thereby serves **two audiences simultaneously**: end users (its primary surface) AND the host's product team (a continuous research instrument). Most agents output to users only; this one is also a structured product-research output stream.
- **Prior-art assessment:**
  - Some chatbots tag conversations into category buckets for analytics — coarse-grained, not actionable as product input.
  - Customer-feedback platforms (Productboard, Canny) collect manual feedback — not extracted from live agent interactions.
  - Conversation-analytics tools (Gong for sales, Ada for support) summarize for managers — not framed as a continuous product-feedback stream from a deployed agent.
  - The framing of "agent as a first-class continuous voice-of-customer pipeline alongside its primary user-facing role" — packaged as a single deployable that delivers both audiences — appears uncommon.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible — method claim covering continuous extraction of product-team-facing signals (pain points, capability requests, friction patterns, prioritization) from agent-user interactions, with structured surfacing to product-team workflows.
- **Open questions:** Surface format (dashboard / webhook / digest / auto-PR)? Per-user consent model for upstream surfacing? Severity / frequency weighting algorithm? Integration with existing product-management tools (Linear / Jira / GitHub Issues)?

### [2026-04-26] Unified active + deduced feedback substrate driving both eval and personalization
- **Originator:** Rahul
- **Source:** Q6 answer 2026-04-26: "I want it to have active and deduced feedback mechanisms with loop as well."
- **Description:** Combine **active feedback** (explicit user signals: thumbs, ratings, written comments) with **deduced feedback** (inferred from behavior: did the user accept the suggestion? abandon the workflow? retry? revisit later? deepen?) into a single feedback substrate that simultaneously powers (a) live + offline **eval scoring** AND (b) per-user **personalization adjustments**. Most systems treat eval (quality measurement) and personalization (user-specific tailoring) as separate pipelines reading separate signals; unifying them via a shared feedback substrate creates faster, tighter loops in both directions.
- **Prior-art assessment:** Eval frameworks (Langfuse, Helicone, Ragas) collect feedback for scoring. Personalization systems (recommender systems, user-modeling stacks) collect feedback for ranking. The unified substrate framing — one ingest path, dual-use downstream — is uncommon as a packaged design.
- **Novelty signal:** medium.
- **Patentability hint:** possible — system claim covering unified active + deduced feedback ingestion driving both eval scoring and personalization model updates in an embedded agent context.
- **Open questions:** Deduction inference rules for each behavior signal? Conflict resolution when active and deduced feedback diverge? Decay model for feedback weight over time?

### [2026-04-26] Multi-framework component registry under a single Web Component shell
- **Originator:** Rahul
- **Source:** Q2 answer 2026-04-26: "this web component will also have a widget registry as well where the enterprise can register their standard widgets and components for rendering with the data in the UI of the agent, and these registered widgets/components could be in React/Vue/Svelte/Angular etc. Plus this webcomponent needs to be able to interact with the rest of the website/app so it needs to have an integration framerwork with the enterprise's UI framework."
- **Description:** The embeddable agent shell is a single Web Component, but its component registry hosts UI primitives written in **any major UI framework** (React, Vue, Svelte, Angular, vanilla Web Components). The shell ships with an integration framework that allows two-way interaction with the host page's UI framework (so the agent can highlight host elements, read state, drive interactions). One shell, one registration API, multi-framework rendering inside.
- **Prior-art assessment:**
  - **Module Federation** allows runtime loading of code from multiple deployed apps but does not standardize a multi-framework component-registration API.
  - **Custom-element wrappers** for individual frameworks exist (Lit, Stencil, Atomico) but are point solutions for one framework at a time.
  - **Single-spa** orchestrates multiple framework apps in one page, but treats them as page-level micro-frontends, not a shared component registry.
  - The combination of (a) single Web Component shell, (b) multi-framework component registry inside, (c) unified registration API, (d) host-framework integration framework, (e) all in service of an LLM composer — is uncommon as a packaged solution.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible — system claim covering a Web Component shell hosting a multi-framework component registry feeding an LLM-driven UI composer, with two-way host-framework integration.
- **Open questions:** Rendering mechanism (Module Federation vs. per-framework custom-element wrappers vs. universal renderer)? How are framework-specific lifecycle hooks unified? Performance overhead of multi-framework runtime in one page?

### [2026-04-26] AI-native time-tiered summarization stores with agent-driven tier selection
- **Originator:** Rahul (refined 2026-04-26 in Q6 answer)
- **Source:** Initial vision dump + Q6: "It should also generate summaries per session, per day, week, month and year."
- **Description:** Purpose-built stores that answer time-bounded behavioral queries natively, optimized for agent retrieval rather than analytics dashboards. Tiers: **session / day / week / month / year**, each with its own summarization granularity. The agent picks the right tier for the right question (e.g., "what did the user just do?" → session summary; "what's their long-term pattern?" → month/year summary).
- **Prior-art assessment:** Time-series DBs (Timescale, ClickHouse) handle the storage but are not AI-native (no semantic retrieval, no summarization tiers, no agent-optimized query interface). Vector DBs handle semantics but not time-windowed behavior natively. Combining the two with summarization tiers per window plus agent-driven tier selection appears uncommon as a packaged primitive.
- **Novelty signal:** medium — the building blocks exist, but the packaged tiered abstraction for agent consumption is non-obvious.
- **Patentability hint:** possible — system claim around tiered summarization stores indexed by temporal window with agent-driven tier selection at query time.
- **Open questions:** Summarization cadence and trigger per tier? Privacy boundaries? Cross-tier consistency on backfill?

### [2026-04-26] Declarative Feature/Service registry as the LLM-consumable surface for host workflows
- **Originator:** Rahul
- **Source:** "app developers and domain developers within the enterprise can come and configure their own workflows in its system in the form of featured documents or service documents."
- **Description:** Host domain developers describe their workflows as documents (format TBD) declaring: experience, workflow steps, preconditions, hints about which sub-agents/skills/tools to use. The LLM planner consumes these documents directly as context — they are not compiled to code, not run by a workflow engine, but are read by the planner to inform its plans.
- **Prior-art assessment:** Workflow tools (Zapier, n8n, Temporal) compile workflows to imperative execution. Declarative configs (e.g., for chat flows) typically branch deterministically. Feeding workflow documents directly to an LLM planner as soft hints — letting the planner deviate when it has reason to — is uncommon.
- **Novelty signal:** medium-high — the "documents as planner hints, not executable workflows" stance is a distinctive design choice.
- **Patentability hint:** possible — method claim around LLM-planner consumption of declarative workflow docs as soft hints with deviation policy.
- **Open questions:** Document format? Deviation gating? Versioning?
