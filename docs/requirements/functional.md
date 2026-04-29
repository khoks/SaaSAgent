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

## FR-M — Memory (refined per ADR-008; see [docs/architecture/memory.md](../architecture/memory.md))
- **FR-M-001** — Cross-session per-user memory.
- **FR-M-002** — Tracks: interests, pain points, common queries, problems-discussed, solutions-given, solutions-accepted, feedback received.
- **FR-M-003** — Tracks workflows initiated from Features/Services registry — `active` / `completed` / `abandoned` / `superseded`, with resumability across sessions.
- **FR-M-004** — Time-tiered summaries: **session, day, week, month, year** — agent-queryable per tier.

## FR-MEM — Memory stores (new — per ADR-008)
- **FR-MEM-001** — Raw interaction log: append-only, immutable, ∞ retention, in traditional DB (Postgres default).
- **FR-MEM-002** — Continuous derivation pipeline: raw log → derived stores (profiles, summaries, graph, signals).
- **FR-MEM-003** — Customer interaction profile (personalization + empathy): communication style, expertise level, frustration triggers, success patterns.
- **FR-MEM-004** — SaaS service usage profile: features used, depth, frequency, sequences (within the host's product).
- **FR-MEM-005** — SaaS domain profile: domain-specific persona traits.
- **FR-MEM-006** — Workflow state store: per-user workflow progress + status + resumability.
- **FR-MEM-007** — Semantic recall via vector embeddings (Qdrant in default deployment; pluggable adapter).
- **FR-MEM-008** — All stores partitioned by `(tenant_id, user_id)` for isolation, GDPR right-to-erasure, per-user analytics.
- **FR-MEM-009** — Source-of-truth invariant: all derived stores rebuildable from the raw log.
- **FR-MEM-010** — Pluggable adapter interface per store; defaults ship as PG / Qdrant / ClickHouse / Neo4j; enterprises can swap.

## FR-PSG — Problem-Solution Graph (new — per ADR-008)
- **FR-PSG-001** — Continuous extraction of (problem, solution, context, outcome) tuples from interactions.
- **FR-PSG-002** — Semantic deduplication into canonical entries (intra-tenant scope: across the enterprise's user base; never cross-enterprise per ADR-006).
- **FR-PSG-003** — Graph relations: problem ↔ solution ↔ feature ↔ pain-point ↔ user-type, stored in Neo4j.
- **FR-PSG-004** — Agent-queryable: planner can recall canonical solutions for new users with semantically similar problems.
- **FR-PSG-005** — Outcome attribution: track which solutions worked for which user types, update graph weights accordingly.

## FR-FB — Feedback (new — per ADR-008)
- **FR-FB-001** — Active feedback: explicit user signals (thumbs, ratings, written comments).
- **FR-FB-002** — Deduced feedback: inferred from behavior — acceptance, abandonment, retry, revisit, deepening.
- **FR-FB-003** — Unified feedback substrate: active + deduced flow through one ingest pipeline; downstream consumers are eval scoring AND personalization profile updates.
- **FR-FB-004** — Conflict resolution policy when active and deduced feedback diverge.

## FR-EVAL — Eval (new — per ADR-008)
- **FR-EVAL-001** — Live per-interaction eval (lightweight, on-stream).
- **FR-EVAL-002** — Offline per-session eval (batch, deeper).
- **FR-EVAL-003** — Eval datapoints stored in ClickHouse for trend analysis and regression detection.
- **FR-EVAL-004** — Eval target metrics TBD (Batch 3): groundedness, helpfulness, intent-alignment, latency, completion-rate, etc.
- **FR-EVAL-005** — Live scoring approach TBD (Batch 3): LLM-as-judge / heuristics / embedded eval models.
- **FR-EVAL-006** — Eval informs both quality dashboards (host ops team) AND personalization (per-user adjustments).

## FR-VOC — Voice-of-Customer (new — per ADR-008)
- **FR-VOC-001** — Continuous extraction of feature pain points from interactions.
- **FR-VOC-002** — Continuous extraction of feature/capability requests (explicit and implied).
- **FR-VOC-003** — Continuous extraction of friction patterns (UX dead ends, repeated user struggles).
- **FR-VOC-004** — Aggregation with prioritization weighting (frequency, severity, customer-segment).
- **FR-VOC-005** — Surface to host's product team: format TBD (dashboard / webhook / digest / auto-PR), see Batch 3.
- **FR-VOC-006** — Per-user consent model for upstream surfacing.

## FR-TEL — Agent self-telemetry (new — per ADR-008)
- **FR-TEL-001** — Usage statistics about the agent platform itself: turns per session, composition cycles, tool invocations, sub-agent invocations, latency distributions, model spend.
- **FR-TEL-002** — Stored in ClickHouse for analytics; dashboards for the host's ops team.
- **FR-TEL-003** — Per-tenant cost caps and circuit breakers (FR-COST follow-up).

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
