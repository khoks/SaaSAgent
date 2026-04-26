# Functional Requirements

> Living document. Each requirement gets an ID (`FR-###`) so we can reference it from ADRs, stories, and tests.

## Categories
- **FR-S\***: Shell & embedding
- **FR-C\***: Conversation & widget rendering
- **FR-O\***: Orchestration, planning, thinking
- **FR-R\***: Registries (Skills, Sub-Agents, Tools, Widgets, Features/Services)
- **FR-M\***: Memory & profiles
- **FR-I\***: Multimodal I/O (vision, mic, narration, click/highlight)
- **FR-P\***: Proactive engine
- **FR-A\***: Adapters / host integration
- **FR-W\***: Workflow / Feature-Service authoring

## FR-S — Shell & embedding (seed)
- **FR-S-001** — Embeddable in host web app via SDK / web component / iframe (mode TBD).
- **FR-S-002** — Render modes: side-panel, top-down drawer, full-page, ejectable popout.
- **FR-S-003** — Themable to match host enterprise branding without forking.

## FR-C — Conversation & widget rendering (seed)
- **FR-C-001** — Conversational pane renders a scrolling stream of widgets and text turns.
- **FR-C-002** — Widgets are interactable; user actions on widgets emit agentic instructions back to the runtime.
- **FR-C-003** — Widget catalog is extensible by host enterprises via the UI Widget registry.

## FR-O — Orchestration (seed)
- **FR-O-001** — Planner decomposes user intent into sub-tasks across sub-agents, skills, and tools.
- **FR-O-002** — Thinking layer reasons over current context + memory before action.
- **FR-O-003** — Widget-selection layer chooses appropriate widget(s) to render given current step + host registry.

## FR-R — Registries (refined per ADR-004, ADR-005)
- **FR-R-001** — AI Skills registry: catalog of executable skills with input/output schemas.
- **FR-R-002** — Sub-Agents registry: catalog of specialized agents with capability descriptors.
- **FR-R-003** — Tools registry: catalog of callable tools (host APIs, external APIs).
- **FR-R-004** — **Atomic UI Components registry:** the host's design-system primitives, registered with name, props schema, slots, semantic role, usage examples, and source framework (React / Vue / Svelte / Angular / vanilla WC). The agent's UI vocabulary.
- **FR-R-005** — **Theme & Branding tokens registry:** color palette, typography scale, spacing scale, radii, motion, voice/tone hints. Drives composition style.
- **FR-R-006** — Features/Services registry: declarative workflow documents authored by host domain devs in **natural language or typed JSON** (the runtime compiles NL → typed JSON). Documents declare: experience, workflow steps, preconditions, hints (sub-agents/skills/tools to prefer, UI experience to compose).
- **FR-R-007** — All registries are **hot-reloadable** without redeploying the agent runtime.

## FR-COMP — UI composition (new — per ADR-005)
- **FR-COMP-001** — Runtime UI Composer accepts: conversation context, memory recall, atomic-component registry, theme tokens, Feature/Service hints — and emits a typed-JSON layout tree referencing host components.
- **FR-COMP-002** — Composed layout tree includes data-wiring spec (which component slots receive which data shape from which source).
- **FR-COMP-003** — WC shell renderer mounts referenced components (multi-framework), applies theme tokens, injects data, subscribes to interaction events.
- **FR-COMP-004** — Each composed artifact emits typed-JSON instructions back to the runtime on user interaction (FR-C-002 refined).
- **FR-COMP-005** — Composition is causality-tracked: each artifact carries a compose-cycle ID for memory + observability replay.
- **FR-COMP-006** — Constrained composition: the composer only references primitives that exist in the registry; off-brand or off-vocabulary output is impossible by construction.

## FR-M — Memory (seed)
- **FR-M-001** — Cross-session per-user memory.
- **FR-M-002** — Tracks: interests, pain points, common queries, problems-discussed, solutions-given, solutions-accepted, feedback received.
- **FR-M-003** — Tracks workflows initiated from Features/Services registry — completed and abandoned.
- **FR-M-004** — Time-windowed behavior queries (last 2m / 10m / day / week / year).

## FR-I — Multimodal I/O (seed)
- **FR-I-001** — DOM observation (what the user is seeing on the host page).
- **FR-I-002** — Microphone listening with VAD + transcription.
- **FR-I-003** — Narration via TTS.
- **FR-I-004** — Element highlight + programmatic click on host page.

## FR-P — Proactive engine (seed)
- **FR-P-001** — Detect next-best-action moments and open the conversation unprompted.
- **FR-P-002** — Attention budget — don't interrupt more than N times per session / day.
- **FR-P-003** — Confidence gating — only trigger above threshold.

## FR-A — Adapters (seed)
- **FR-A-001** — Host event-bus adapter (subscribe + emit).
- **FR-A-002** — Customer profile store adapter.
- **FR-A-003** — SaaS usage profile adapter.
- **FR-A-004** — 3rd-party app usage profile adapter.

## FR-W — Feature/Service authoring (seed)
- **FR-W-001** — Domain devs author Feature/Service documents (format TBD — markdown? YAML? JSON?).
- **FR-W-002** — Documents declare: experience, workflow, preconditions, hints (which sub-agents/skills/tools to prefer).
- **FR-W-003** — Hot-reload of registry without redeploying the agent runtime.

> Each ID above is a **seed**, not a contract. As we groom, we refine, split, or kill them.
