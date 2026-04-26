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

## FR-R — Registries (seed)
- **FR-R-001** — AI Skills registry: catalog of executable skills with input/output schemas.
- **FR-R-002** — Sub-Agents registry: catalog of specialized agents with capability descriptors.
- **FR-R-003** — Tools registry: catalog of callable tools (host APIs, external APIs).
- **FR-R-004** — UI Widgets registry: catalog of composable, theme-aware widgets.
- **FR-R-005** — Features/Services registry: declarative workflow documents authored by host domain devs.

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
