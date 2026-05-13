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

### [2026-04-28] Closed-loop voice-of-customer → customer churn ML model → agent self-correction
- **Originator:** Rahul
- **Source:** Q3.4 answer 2026-04-28: "Voice of customer should also get reprocessed back by the agent platform and consumed as part of the customer's interaction profile, feature pain points feeding into a customer churn ml model to select the feature carefully next time before proposing to the customer and using it for the customer, product improvement opportunities i.e. jira tickets etc."
- **Description:** Voice-of-customer signals are not just an outbound stream to the host's product team. They also flow **back into** the agent platform along three paths: (1) updates to the customer interaction profile, (2) inputs to a per-tenant **Customer Churn ML Model**, (3) product improvement opportunity tracker. The Churn Model takes (customer interaction profile, recent VoC signals, usage trajectory, feature exposure history) and predicts P(churn | customer, feature). The planner/composer consumes this prediction at decision time to **avoid surfacing features that have caused friction for similar customers** — closing the loop. The agent is therefore both the source of churn-relevant observations AND the consumer of the resulting predictions, creating a self-correcting system at the feature-recommendation level.
- **Prior-art assessment:**
  - **Customer-success platforms** (Gainsight, Totango, ChurnZero) model churn but consume signals from CRM/usage telemetry — not from live agent conversations, and not feeding back to a real-time recommendation surface.
  - **Recommender systems** factor in feedback signals (acceptance rate, dwell time) but typically don't model churn risk per (user, item) pair as a first-class consideration.
  - **Conversational AI platforms** generate transcripts that BI tools may post-process for churn signals, offline. Closing the loop in real-time, with an in-platform churn model whose output is consumed by the planner mid-conversation, appears uncommon.
  - The combination of (a) live VoC extraction from agent conversations, (b) reprocessing back into customer profiles, (c) per-tenant churn model with (customer, feature) granularity, (d) planner-consumed churn prediction at recommendation time, (e) self-correcting feature-surfacing — is uncommon as a packaged design.
- **Novelty signal:** **high**.
- **Patentability hint:** **strong** — system claim covering: (1) continuous extraction of feature pain points from agent-user interactions, (2) updating a customer churn model with these signals, (3) querying the churn model at planner decision time for P(churn | customer, candidate-feature), (4) suppressing or down-weighting feature recommendations exceeding a churn-risk threshold, (5) re-evaluating recommendations as new signals arrive. Recommend formal prior-art search before any disclosure.
- **Open questions:** Churn model architecture (gradient-boosted tree / neural / ensemble)? Cold-start strategy when tenant has no historical churn data? Adapter contract for hosts with existing churn models? Threshold-tuning model — per-tenant or per-customer-segment? Explainability requirement (regulators may demand interpretability)?

### [2026-04-28] Auto-PR with suggested product issues, drafted by the agent from observed user struggles
- **Originator:** Rahul
- **Source:** Q3.4 answer 2026-04-28 (confirmed all-of-above for VoC surfaces, including auto-PR): "product improvement opportunities i.e. jira tickets etc."
- **Description:** When the VoC pipeline identifies a pain point with sufficient frequency × severity, the agent platform **automatically opens a pull request** in the host's repo (or a Linear/Jira/GitHub Issue) containing: (1) suggested issue/ticket text, (2) supporting interaction excerpts (privacy-preserving, anonymized), (3) prioritization signals (frequency, severity, customer-segment weighting, churn-risk weighting from the churn model — see closed-loop entry above), (4) proposed resolution if the agent has one. The host's product team reviews and merges or closes. Makes voice-of-customer immediately actionable rather than just observable.
- **Prior-art assessment:**
  - **Issue bots** exist (Dependabot for deps, Renovate for updates, security scanners that file CVEs). All operate on code/dep state, not on user-behavior observations.
  - **Customer-feedback platforms** (Productboard, Canny) generate manual tickets with manual triage.
  - **Sentiment / category tagging** in chatbots produces analytics, not actionable PRs.
  - **Agent-driven auto-PR for product issues based on observed end-user behavior in conversations** is uncommon as a packaged primitive.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible-strong — method claim covering the trigger-and-file pipeline: (1) frequency × severity × churn-risk thresholding on VoC-extracted pain points, (2) automated drafting of issue/PR text with rationale + interaction excerpts, (3) integration to host's product-management system (GitHub / Linear / Jira), (4) structured prioritization metadata.
- **Open questions:** Trigger threshold tuning — frequency, severity, novelty? Anonymization / consent model for interaction excerpts? Default-off vs. default-on for MVP demos? Auto-close on duplicates? Agent learning from product-team's accept/close decisions on its own PRs?

### [2026-05-01] Federated sub-agent architecture: domain-team-owned runtimes federating into the platform via SDK + registry + protocol
- **Originator:** Rahul
- **Source:** Q4.3 answer 2026-05-01: "Sub Agents (and not skills) are separate runtimes built by the domain teams within the enterprise using the boilerplate and SDK provided by the AgentSaaS, and they federate into the AgentSaaS using a Sub agent registry, and have defined protocols of interaction facilitated via the SDK."
- **Description:** Sub-agents are not in-process workers the platform hosts and isolates — they are **separate runtimes** built by domain teams within the enterprise, using boilerplate + SDK shipped by the platform vendor, registering into the platform's Sub-Agent registry, and federating over a defined protocol. The platform's planner orchestrates across sub-agents but does not run them in-process. This crystallizes a **three-tier capability model**: Tools (stateless API calls) → Skills (lightweight in-process capabilities) → Sub-Agents (full external runtimes with their own state/planning/memory/tools). Domain teams iterate on their sub-agents independently of platform release cadence; isolation is automatic by virtue of being separate services.
- **Prior-art assessment:**
  - **In-process multi-agent frameworks** (LangGraph, AutoGen, CrewAI) treat sub-agents as workers within one runtime. No federation; no domain-team ownership boundary.
  - **OpenAI Assistants / Anthropic Tools** treat sub-capabilities as tool calls — flat, stateless, no agent semantics.
  - **GraphQL Federation / service mesh / micro-frontends** are federated patterns at the data/UI layer, not at the agent-orchestration layer.
  - **Anthropic MCP** is a federation-flavored protocol for tool/resource discovery, but does not specifically frame federation as a substrate for full agent runtimes with planning + memory; the framing as "sub-agents owned by domain teams, registered + federated" is distinct.
  - The packaged combination of (a) sub-agent SDK (multi-language) + (b) boilerplate templates + (c) federation protocol spec + (d) registry schema with capability descriptions for planner consumption + (e) explicit framing as a domain-team-ownership boundary — appears uncommon as a packaged design.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible — system claim covering: (1) a sub-agent SDK + boilerplate enabling domain teams to author sub-agents, (2) registration of those sub-agents into a central Sub-Agent registry with capability metadata, (3) a federation protocol the central platform's planner uses to orchestrate across sub-agents, (4) the three-tier capability model (Tools / Skills / Sub-Agents) as the planner's invocation surface.
- **Open questions:** Federation protocol — gRPC / HTTP / WebSocket / SSE / hybrid? SDK languages at MVP — TS only, or TS + Python? Versioning + backward-compat for sub-agent API contracts? Discovery model — pull (registry endpoint) vs. push (sub-agent self-registers on startup)? Health-check + circuit-breaker semantics? Authn/authz between platform and sub-agents (mTLS? JWT? both)?

### [2026-05-01] Auto-generated per-capability eval logic from registry metadata
- **Originator:** Rahul
- **Source:** Q4.5 answer 2026-05-01: "the Agent skill registries and Sub Agent registries should be used to enhance and customize the eval on the fly, custom eval per skill/subagent should get built by considering the entries in these registries."
- **Description:** Most eval systems require human-authored eval criteria per capability — when a new skill or sub-agent is added, someone must write its eval suite. This design **automatically generates eval logic** for each registered capability by reading the registry entry's metadata: capability description, expected input/output schemas, success criteria, examples, semantic role. The eval system parses these into runnable evaluation rules (heuristic checks + LLM-judge prompts) and applies them on-the-fly. New capabilities receive eval coverage at the moment of registration; no separate eval-author step required. The bundled eval backend stores results; the bundled eval dashboard surfaces trends to the host's quality team.
- **Prior-art assessment:**
  - **Existing eval frameworks** (Ragas, Helicone, Langfuse, OpenAI Evals) require manually-authored eval suites per capability. Some auto-generate test cases from sample data, but not eval logic itself.
  - **Auto-generated tests from API specs** (Schemathesis for OpenAPI, etc.) test correctness against declared schemas but don't generate quality / behavior evals.
  - **Fitness-function pipelines** in MLOps require manual configuration per metric.
  - The combination of (a) capability registry as source of truth for eval-relevant metadata, (b) auto-generated eval logic at registration time, (c) heuristic + LLM-judge evaluation generation, (d) bundled in-platform — appears uncommon.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible — method claim covering automatic generation of evaluation logic from capability registry metadata, including heuristic checks derived from declared schemas and LLM-judge prompts derived from capability descriptions and examples.
- **Open questions:** Quality of auto-generated eval vs. hand-authored — when does the auto-version need human override? Schema for "success criteria" in registry entries (DSL? NL? mixed)? Cross-capability eval (e.g., a workflow uses 3 skills + 1 sub-agent — how does eval compose)?

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

### [2026-05-04 / verified 2026-05-10] Implicit negative-signal inference via timing window on follow-up natural-language input (P-004)
- **Originator:** Rahul
- **Source:** Conversation 2026-05-10 (Expedia E2E Chrome test): "evalSignalCount: 1 → 2 — implicit re-ask **fired correctly**. The follow-up 'this is a re-ask' arrived within the 8s window … so the runtime recorded a `negative/user-implicit` signal attributed to that prior cycle. **P-004 verified live in Chrome.**"
- **Description:** After the server broadcasts a composed UI artifact (layout) to a client, it starts a per-connection timer keyed to that artifact's `composeCycleId`. If the client sends a fresh natural-language `user-message` envelope within a configurable timing window (default 8 seconds), the runtime automatically records a `negative/user-implicit` quality signal attributed to the prior layout via its `composeCycleId`. Critically, action emits (button clicks) do NOT trigger the window — clicking is a positive engagement signal; only a fresh NL re-ask implies dissatisfaction. The mechanism produces training signal at the natural rate of user dissatisfaction without any explicit user action. Reduced to practice in `packages/runtime/src/transport/server.ts` (per-WS `lastBroadcastCycleId` / `lastBroadcastAt` state + re-ask intercept) and verified end-to-end in Chrome 2026-05-10.
- **Prior-art assessment:**
  - Web search re-query analysis identifies reformulation patterns at the query level — not applied to AI-agent-emitted typed UI artifacts; no artifact-level attribution.
  - Click-through rate / dwell time as implicit signals don't address the inverse (no clicks + a fresh NL query within a tight window).
  - Conversation abandonment metrics operate at conversation level, not per-artifact.
  - Explicit feedback widgets (thumbs up/down in Anthropic/OpenAI/Google products) only capture explicit signals; do not infer from re-ask timing.
  - The specific combination of timing-windowed inference + per-artifact attribution via compose-cycle-id in the context of server-broadcast typed-JSON UI artifacts appears uncommon in the literature and in production.
- **Novelty signal:** high — the typed-artifact attribution via compose-cycle-id is the distinguishing element; timing windows alone exist in search literature.
- **Patentability hint:** strong — method claim covers (a) server broadcasts artifact with unique cycle id, (b) per-connection timer starts, (c) fresh NL user-message within window triggers negative signal attributed to prior cycle id, (d) action emits explicitly excluded, (e) configurable window with disable (window=0). See `docs/patents/disclosures/P-004-implicit-reask-signal-inference.md` for full claims and prior-art table. Bucket A (file before OSS publish) per STRATEGY.md.
- **Open questions:** Two-band window variant (< 3s = strong negative; 3–15s = weak negative) not yet implemented. Semantic similarity guard (embedding-compare new message to prior turn to distinguish re-ask vs. pivot) is a planned enrichment but requires embedding provider. P-004 + P-005 combination claim (single application vs. two filings) is open for patent counsel.

### [2026-04-26 / refined 2026-04-28] Feature/Service docs as agent-readable super-skill documents (no compilation)
- **Originator:** Rahul (refined 2026-04-28 in Q3.1 answer; format choice in ADR-011, no-compilation choice in ADR-013)
- **Source:** "app developers and domain developers within the enterprise can come and configure their own workflows in its system in the form of featured documents or service documents." + Q3.1 2026-04-28: "Do we really want the md format to be compiled to JSON? shouldn't the Agent platform just read it as a super skill doc and just execute it using its intelligence?"
- **Description:** Host domain developers author their workflows as `.feature.md` documents (Markdown + YAML frontmatter + optional inline JSON for runtime-typed parts). The agent platform **does not compile these to executable form**. Instead, the agent reads them directly as planner context — they are super-skill documents, soft hints that guide the planner's decisions. The planner can deviate when it has reason to. Inline JSON is reserved for parts that MUST be runtime-typed (preconditions evaluated programmatically, registry IDs for skills/tools/sub-agents/atomic components). This is the AI-native consumption model — analogous to how Claude Code skills are authored as markdown that an agent reads and uses.
- **Prior-art assessment:** Workflow tools (Zapier, n8n, Temporal, Airflow, BPMN engines) compile workflows to imperative or declarative execution. AI workflow tools (LangGraph, Inngest-like, AutoGen) typically still have a structured definition layer that gets executed by a runtime. Feeding workflow documents directly to an LLM planner as soft hints (no compilation) — and explicitly framing them as analogous to skill prompts — is uncommon as a packaged design. Closest analogue: Claude / Claude Code skills, which inspired this framing but are author-time tools, not a host-extensibility surface in a deployed platform.
- **Novelty signal:** medium-high — the "no compilation, soft prompts, planner-deviation-allowed" stance is a distinctive AI-native design choice.
- **Patentability hint:** possible — method claim around: a registry of host-authored workflow docs in NL+structured-hint form, consumed directly by an LLM planner as context, with deviation policy gated by runtime preconditions and registry-validated typed-hints.
- **Open questions:** Deviation gating heuristics? Versioning of docs across registry releases? Caching strategy for prompt-cache-hit on stable docs?

### [2026-05-07] Compose-cycle-id causality binding across bidirectional loop turns (P-001)
- **Originator:** Rahul / joint (emerged from implementation)
- **Source:** Phase 1.1 implementation: every `ComposedLayout` carries a `composeCycleId`; every `InstructionEnvelope` emitted by the shell back to the runtime carries the same ID, creating a traceable causality chain.
- **Description:** Every composed layout emitted by the runtime carries a unique `composeCycleId`. When the shell emits a user-interaction envelope (click, form submission, typed instruction) back to the runtime, it includes the `composeCycleId` of the layout that generated it. This allows the runtime to maintain a full causality chain: compose → user action → re-compose, with every hop traceable. The causality graph enables: (1) debugging (which layout caused which action, which action caused which re-compose), (2) session replay, (3) attribution of eval signals to specific composed artifacts, (4) memory indexing by causality chain rather than just time. Filed as provisional patent P-001.
- **Prior-art assessment:** Conversation history in LLM APIs (OpenAI, Anthropic) tracks turn order but not causality within a turn. Event-sourcing systems maintain causal order but are not designed for interactive agent loops. The combination of (a) per-composed-layout causality ID, (b) ID propagated back in user-interaction envelopes, (c) multi-hop chain from composed artifact to instruction to next artifact — as a first-class protocol primitive in a bidirectional agent loop — appears uncommon.
- **Novelty signal:** high — the protocol-level causality chain binding composed UI artifacts to the instructions they generate is a distinctive design.
- **Patentability hint:** strong — full disclosure at `docs/patents/disclosures/P-001-compose-cycle-id-causality.md`. System claim covering: composed layout + ID → instruction emit carrying same ID → re-compose receiving instruction with causality chain → chain usable for eval attribution and session replay.
- **Open questions:** Maximum chain depth before compaction? Cross-session chain linking?

### [2026-05-07] Prefix-discriminated tool routing for three-tier capability dispatch (P-002)
- **Originator:** joint (emerged from SonnetPlanner implementation in Phase 2.1b)
- **Source:** Phase 2.1b implementation: tool names passed to the planner LLM use prefixes `skill__`, `tool__`, `subagent__` to encode which execution tier should handle the invocation.
- **Description:** The SonnetPlanner exposes all platform capabilities to the Sonnet model as a flat list of tool definitions. To disambiguate which execution tier handles each invocation without requiring the model to know the tier distinction explicitly, tool names are prefixed: `skill__<name>` routes to `SkillExecutor`, `tool__<name>` routes to `ToolExecutor` (HTTP), `subagent__<name>` routes to `SubAgentExecutor` (gRPC federated). A single `ToolMapper` module parses the prefix at dispatch time. The model uses tool names semantically (it chooses `subagent__weather-specialist` because that's the right capability) but the platform uses the prefix to route deterministically. Filed as provisional patent P-002 (defensive publication recommended over filing).
- **Prior-art assessment:** Multi-tier agent systems (LangGraph, AutoGen) typically implement dispatch via object type or conditional logic outside the model's awareness. OpenAI function calling and Anthropic tool use have flat tool lists with no tier encoding. Encoding tier as a name prefix that survives the model's tool selection — so dispatch is purely mechanical post-model — is uncommon as a packaged design.
- **Novelty signal:** medium — elegant and non-obvious but likely derivable; prior-art search needed before filing.
- **Patentability hint:** possible → defensive publication preferred. Full disclosure at `docs/patents/disclosures/P-002-prefix-discriminated-tool-routing.md`.
- **Open questions:** Prefix collision if tool names contain double-underscore? Versioning if a new tier is added?

### [2026-05-07] Symmetric federation contract — any runtime serves as sub-agent of another (P-003)
- **Originator:** joint (emerged from Phase 2.4.x implementation)
- **Source:** Phase 2.4.x implementation: a `/federate` HTTP endpoint added to RuntimeServer so any SaaSAgent runtime can receive delegation from another runtime acting as a parent orchestrator.
- **Description:** Every SaaSAgent runtime instance exposes a `/federate` endpoint in addition to its own planner/shell endpoints. When a parent runtime registers a child runtime as a sub-agent in its Sub-Agent registry, it sends delegation requests to the child's `/federate` endpoint. The child receives the delegation, runs its own planner + executor loop, and returns a `FederationResponse`. Any runtime can therefore serve as either an orchestrator (parent) or a sub-agent (child) or both simultaneously — **symmetric federation**. This enables multi-level orchestration hierarchies (parent → domain runtime → specialist runtime) without any special configuration. Filed as provisional patent P-003.
- **Prior-art assessment:** Most multi-agent frameworks (LangGraph, AutoGen, CrewAI) designate static orchestrator vs. worker roles at design time. MCP supports tool/resource federation but not full-agent delegation with its own planner loop. The symmetric, role-agnostic federation contract — any runtime can be a parent or child — is uncommon as a packaged design.
- **Novelty signal:** medium-high — the symmetry (same runtime binary, either role) is a distinctive architectural property.
- **Patentability hint:** possible. Full disclosure at `docs/patents/disclosures/P-003-symmetric-federation-contract.md`.
- **Open questions:** Circular delegation prevention (A delegates to B which delegates back to A)? Depth limits?

### [2026-05-07] Implicit re-ask signal inference from inter-message timing (P-004)
- **Originator:** joint (emerged from Phase 2.5.x implementation)
- **Source:** Phase 2.5.x implementation: when a user sends a second message within N seconds of the runtime broadcasting a composed layout, the runtime infers a `negative/user-implicit` eval signal without any explicit feedback action from the user.
- **Description:** The runtime tracks the timestamp of the most recently broadcast `ComposedLayout` per WS session. When the next `user-message` envelope arrives, if the elapsed time is below a configurable threshold (default: a few seconds), the platform infers a negative eval signal: the user did not find the last response satisfactory and is immediately re-asking. This implicit signal feeds the unified active+deduced feedback substrate (ADR-008) alongside explicit thumbs-up/down signals. No user action is required — the timing alone is sufficient. Complements active `FeedbackBar` widget signals. Filed as provisional patent P-004.
- **Prior-art assessment:** Recommendation systems use dwell time and skip rate as implicit signals. Conversational AI eval platforms (Langfuse, Helicone) require explicit feedback or LLM-judge scoring. Inferring user dissatisfaction from inter-turn timing within a real-time agent loop — and routing it to the same eval substrate as explicit feedback — is uncommon as a packaged primitive.
- **Novelty signal:** medium — timing-based implicit signals are known in recommendation; the agent-loop framing is the novel application.
- **Patentability hint:** possible. Full disclosure at `docs/patents/disclosures/P-004-implicit-reask-signal-inference.md`.
- **Open questions:** Threshold calibration (varies by intent complexity)? False-positive rate when user is a fast typer?

### [2026-05-07] Explainable churn derivation with per-signal human-readable rationale (P-005)
- **Originator:** joint (emerged from Phase 2.6 / WeightedFeatureChurnCalculator implementation)
- **Source:** Phase 2.6.x implementation: `WeightedFeatureChurnCalculator` produces a churn-risk score AND a `factors` array of human-readable strings explaining which signals contributed and why.
- **Description:** The `ChurnRiskCalculator` interface returns not just a numeric risk score but a structured `factors` list: each entry names a specific signal (e.g., "3 negative feedback events in last 24h", "feature X caused friction for similar users") and its direction of contribution. These factors are: (1) surfaced in the admin VoC dashboard so product teams understand why churn risk is elevated, (2) used by the auto-PR pipeline as rationale when drafting product-issue tickets, (3) stored in ClickHouse for trend analysis, (4) passed to the planner at decision time so the planner can reason about which specific features to avoid for this user. The `WeightedFeatureChurnCalculator` is a parameterized linear model (sigmoid + L2 regularization) with a `trainChurnWeights()` pure-numeric logistic regression for warm-start weight updates. Filed as provisional patent P-005.
- **Prior-art assessment:** LightGBM + SHAP provides post-hoc feature importances on a trained model — not the same as per-decision, per-user rationale strings derived from live session signals. Customer-success platforms (Gainsight) produce aggregate churn scores without per-decision signal attribution. The combination of (a) per-session churn score derivation from live eval signals, (b) per-signal human-readable rationale, (c) rationale consumed by the planner at recommendation time to suppress specific features — as a unified runtime system — appears uncommon.
- **Novelty signal:** medium-high.
- **Patentability hint:** possible-strong. Full disclosure at `docs/patents/disclosures/P-005-explainable-churn-derivation.md`.
- **Open questions:** Rationale string localization? Regulatory explainability requirements per jurisdiction?

### [2026-05-12] Multi-signal proactive scoring with per-signal explainability and session-scoped attention budget (P-006)
- **Originator:** joint (emerged from Phase 5 / ProactiveEngine implementation)
- **Source:** Phase 5 session 2026-05-12 — "Engine logged 2 fires (matching the budget=2 cap) with full per-signal explainability — exactly the patentable contract." PR #39, ADR-042.
- **Description:** The proactive engine scores 6 signals per WS session tick to decide whether to autonomously compose and broadcast a layout without any user input. The 6 signals are: `idle_time` (ms since last user message), `eval_signal_count` (accumulated negative eval signals in session), `dom_event_count` (DOM activity volume indicating user engagement level), `session_depth` (total message turns), `message_gap` (complement to idle_time capturing structured turn pacing), and `explicit_attention_request` (host-emitted semantic event flag). Each signal has a configurable weight; the composite score is compared to a threshold. Crucially, on every trigger the runtime logs the **full per-signal breakdown** (signal name, raw value, weight, weighted contribution) — the firing rationale is fully explainable, not a black-box score. An attention budget governs how many times the engine can fire: default is 2 fires per session, 5 per day, with a 30-second inter-fire cooldown. The per-session tick is a `setInterval` spawned at WS connect time with direct closure over per-session state; it is garbage-collected automatically on WS disconnect. Pending disclosure draft: `docs/patents/disclosures/P-006-multi-signal-proactive-scoring.md`.
- **Prior-art assessment:** Recommendation-system "explore vs. exploit" policies (bandit algorithms) adapt to user signals but operate on item catalogs, not agent proactivity timing. Push-notification systems (Firebase FCM, OneSignal) use behavioral triggers but fire outside the UX surface and are not embedded in a bidirectional agent loop. In-app product-tour / nudge systems (Appcues, Pendo) are rule-based (time-after-signup) and are not signal-scored. The combination of (a) multi-dimensional session signal scoring with configurable weights, (b) per-trigger explainability log (which signals fired and by how much), (c) attention budget with per-session + per-day caps, (d) integrated into the bidirectional agent loop such that the engine itself composes and broadcasts a layout using the same `compose()` path as user-driven turns — appears novel as a packaged runtime primitive.
- **Novelty signal:** high — the per-signal explainability contract and the budget-governed autonomous composition distinguish this from prior-art push/nudge systems.
- **Patentability hint:** strong — method claim covers: (a) per-WS-session tick scoring N named signals with configured weights, (b) trigger when composite score ≥ threshold AND budget not exhausted, (c) runtime composes + broadcasts a layout autonomously using the same composition path as user-driven turns, (d) per-trigger explainability record (signal breakdown) emitted alongside the broadcast. Recommend Bucket A (file before OSS publish) per FILING-CHECKLIST.md — commercial leverage via the proactive re-engagement differentiator.
- **Open questions:** Learned trigger model replacing the linear composite score at v1 (ADR-018)? Per-day budget persistence requires ClickHouse (MVP resets with server restart). Combination claim with P-004 (timing-based signals from implicit re-ask)?
