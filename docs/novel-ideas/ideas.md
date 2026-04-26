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

### [2026-04-26] AI-native time-windowed behavior stores
- **Originator:** Rahul
- **Source:** "what the user was doing in the past two minutes 10 minutes week year etc."
- **Description:** Purpose-built stores that answer time-bounded behavioral queries natively, optimized for agent retrieval rather than analytics dashboards. Different windows (2m / 10m / day / week / year) may use different storage tiers, summarization granularities, and retrieval models, with the agent able to pick the right window for the right question.
- **Prior-art assessment:** Time-series DBs (Timescale, ClickHouse) handle the storage but are not AI-native (no semantic retrieval, no summarization tiers, no agent-optimized query interface). Vector DBs handle semantics but not time-windowed behavior natively. Combining the two with summarization tiers per window appears uncommon as a packaged primitive.
- **Novelty signal:** medium — the building blocks exist, but the packaged tiered abstraction for agent consumption is non-obvious.
- **Patentability hint:** possible — system claim around tiered summarization stores indexed by window with agent-driven window selection.
- **Open questions:** Storage tech per tier? Summarization cadence and trigger? Privacy boundaries?

### [2026-04-26] Declarative Feature/Service registry as the LLM-consumable surface for host workflows
- **Originator:** Rahul
- **Source:** "app developers and domain developers within the enterprise can come and configure their own workflows in its system in the form of featured documents or service documents."
- **Description:** Host domain developers describe their workflows as documents (format TBD) declaring: experience, workflow steps, preconditions, hints about which sub-agents/skills/tools to use. The LLM planner consumes these documents directly as context — they are not compiled to code, not run by a workflow engine, but are read by the planner to inform its plans.
- **Prior-art assessment:** Workflow tools (Zapier, n8n, Temporal) compile workflows to imperative execution. Declarative configs (e.g., for chat flows) typically branch deterministically. Feeding workflow documents directly to an LLM planner as soft hints — letting the planner deviate when it has reason to — is uncommon.
- **Novelty signal:** medium-high — the "documents as planner hints, not executable workflows" stance is a distinctive design choice.
- **Patentability hint:** possible — method claim around LLM-planner consumption of declarative workflow docs as soft hints with deviation policy.
- **Open questions:** Document format? Deviation gating? Versioning?
