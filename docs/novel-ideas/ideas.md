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

### [2026-04-26] Widgets as bidirectional agentic instruction emitters (not just renderable UI)
- **Originator:** Rahul
- **Source:** "those widgets will ultimately give agentic instructions back to this agentic system so that it can think plan execute and then render the next set of conversational pieces or widgets."
- **Description:** UI widgets in the conversational pane are not passive output. Every interaction (click, scroll, hover, form-fill) emits a structured agentic instruction back into the orchestrator, which re-plans and renders the next stream of widgets. The conversational pane becomes a closed-loop agentic interface, not a chat log with embedded cards.
- **Prior-art assessment:** Most agent UIs treat widgets as terminal output (Claude artifacts, ChatGPT canvas) or as forms that submit back as text. The bidirectional, structured-instruction loop framed as a first-class protocol is uncommon. Closest analogues: server-driven UI in mobile (Airbnb's GraphQL-driven UI), but those are not agent-coupled.
- **Novelty signal:** high — the framing of widgets as bidirectional agentic-instruction emitters with a typed protocol back to a planner is a distinctive design choice.
- **Patentability hint:** possible — method claim covering the widget→instruction→re-plan→widget loop in an embeddable agent context.
- **Open questions:** What is the instruction schema? Are instructions natural-language, JSON-structured, or both? How is causality tracked across the loop for memory?

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
