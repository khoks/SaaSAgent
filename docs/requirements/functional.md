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

## FR-R — Registries (refined per ADR-004, ADR-005, ADR-013, ADR-021, ADR-022, ADR-025)
- **FR-R-001** — **Skills registry:** lightweight in-process capabilities (functions, prompts, JSON-defined behavior). Process-isolated by default; WASM at v1 for adapter-supplied skill code. Registered with input/output schemas, capability description, success criteria, examples (used for auto-generated eval — FR-EVAL-007).
- **FR-R-002** — **Sub-Agents registry (federated):** **external runtimes** built by domain teams using the platform's SDK + boilerplate; sub-agents federate into the platform via a defined protocol. Registry entries: name, capability descriptors (semantic — for planner + auto-eval consumption), endpoint, auth, SLA, protocol version, health, owner team. Per [ADR-021](../decisions/decision-log.md).
- **FR-R-003** — **Tools registry:** stateless callable tools (host APIs, external APIs) with input/output schemas.
- **FR-R-004** — **Atomic UI Components registry:** the host's design-system primitives, registered with name, props schema, slots, semantic role, usage examples, source framework (React / vanilla WC at MVP; Vue / Svelte / Angular at v1.5). The agent's UI vocabulary.
- **FR-R-005** — **Theme & Branding tokens registry:** stored as **W3C Design Tokens (DTCG)** canonical schema; importable from Style Dictionary or CSS variables. Drives composition style. Per [ADR-025](../decisions/decision-log.md).
- **FR-R-006** — **Features/Services registry:** `.feature.md` documents authored by host domain devs (Markdown + YAML frontmatter + optional inline JSON for typed parts). The agent reads them directly as super-skill docs — **no compilation**. Per [ADR-011](../decisions/decision-log.md), [ADR-013](../decisions/decision-log.md).
- **FR-R-007** — **Adapters registry (NEW, per ADR-022):** declares (a) host-emitted custom semantic event channels (event name, payload JSON schema, source), (b) data adapters (host APIs, customer profile store, usage profile store, churn model adapter, embedding adapter). Feature/Service docs may *reference* event names from this registry as triggers/preconditions.
- **FR-R-008** — All registries are **hot-reloadable** without redeploying the agent runtime.

## FR-CAP — Three-tier capability model (new, per ADR-021)
- **FR-CAP-001** — **Tools** = stateless API calls (HTTP) with input/output schemas; planner-invoked directly; cheapest.
- **FR-CAP-002** — **Skills** = lightweight in-process capabilities; medium-weight; run inside platform process.
- **FR-CAP-003** — **Sub-Agents** = full external runtimes with their own state, planning, memory, tools; built by domain teams; federated.
- **FR-CAP-004** — Planner orchestrates across all three tiers as appropriate to the task.

## FR-SDK — Sub-Agent SDK + boilerplate + federation protocol (new, per ADR-021)
- **FR-SDK-001** — **Sub-Agent SDK** in multiple languages (minimum: TS, Python; later: Go).
- **FR-SDK-002** — SDK responsibilities: registration with platform, federation protocol implementation, health checking, retries, circuit breaking, observability hooks (OpenTelemetry), error semantics.
- **FR-SDK-003** — **Boilerplate templates** per language — `agentsaas init sub-agent` (or equivalent) scaffolds a runnable sub-agent with sensible defaults.
- **FR-SDK-004** — **Federation protocol spec** (TBD Batch 5: gRPC / HTTP / WebSocket / hybrid). Versioned; backward-compat policy required.
- **FR-SDK-005** — Authn/authz between platform and sub-agents (TBD Batch 5: mTLS / JWT / both).
- **FR-SDK-006** — Discovery model — pull from registry endpoint or push (sub-agent self-registers on startup) — TBD Batch 5.

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

## FR-EVAL — Eval (per ADR-008, refined per ADR-023)
- **FR-EVAL-001** — Live per-interaction eval (lightweight, on-stream).
- **FR-EVAL-002** — Offline per-session eval (batch, deeper).
- **FR-EVAL-003** — Eval datapoints stored in ClickHouse for trend analysis and regression detection.
- **FR-EVAL-004** — **Cross-cutting target metrics** (heuristics, every interaction): latency, completion rate, cost per session.
- **FR-EVAL-005** — **Quality target metrics** (LLM-as-judge, sampled ~5%): groundedness, helpfulness, intent-alignment, composition correctness.
- **FR-EVAL-006** — Eval informs quality dashboards (host's quality team) AND personalization (per-user adjustments) AND proactive-engine learned trigger model (FR-P-001).
- **FR-EVAL-007** — **Auto-generated per-capability eval** (per ADR-023): for each registered Skill / Sub-Agent, the eval system reads registry-entry metadata (capability description, expected I/O schemas, success criteria, examples) and **dynamically generates** runnable eval logic — heuristic checks derived from declared schemas + LLM-judge prompts derived from descriptions and examples. New capabilities receive eval coverage at registration with no separate eval-author step.
- **FR-EVAL-008** — **Bundled eval backend** (OSS tier): storage (ClickHouse), scoring runners (heuristic + LLM-judge), regression detection, alerting hooks.
- **FR-EVAL-009** — **Bundled eval dashboard** (OSS tier): per-skill / per-sub-agent / per-feature trends, regressions, sample interaction drill-down.
- **FR-EVAL-010** — Embedded eval models (small dedicated scorers) added at v1 for the metrics that prove most decision-critical from MVP usage.
- **FR-EVAL-011** — Active+deduced feedback (FR-FB) is the ground-truth anchor that calibrates auto-generated eval over time.

## FR-VOC — Voice-of-Customer (per ADR-008, refined per ADR-016)
- **FR-VOC-001** — Continuous extraction of feature pain points from interactions.
- **FR-VOC-002** — Continuous extraction of feature/capability requests (explicit and implied).
- **FR-VOC-003** — Continuous extraction of friction patterns (UX dead ends, repeated user struggles).
- **FR-VOC-004** — Aggregation with prioritization weighting (frequency × severity × customer-segment × churn-risk).
- **FR-VOC-005** — **Outbound surfaces (all configurable, multi-select):** embedded dashboard + webhook (Linear/Jira/GitHub Issues) + Slack/email digest + auto-PR with suggested issues. Default-on for MVP demo: weekly Slack digest + embedded dashboard.
- **FR-VOC-006** — Per-user consent model for upstream surfacing (anonymization of interaction excerpts).
- **FR-VOC-007** — **Closed-loop reprocessing back into platform** (per ADR-016): VoC signals update (a) customer interaction profile (FR-MEM-003), (b) Customer Churn ML Model inputs (FR-CHURN), (c) product improvement opportunity tracker (Jira/Linear/GitHub).
- **FR-VOC-008** — Auto-PR pipeline: trigger on frequency × severity × novelty thresholds; generated PR/ticket includes rationale, prioritization metadata, anonymized interaction excerpts, proposed resolution if available.
- **FR-VOC-009** — Agent learning from product-team's accept/close decisions on auto-filed PRs (feedback loop).

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

## FR-W — Feature/Service authoring (refined per ADR-011, ADR-013)
- **FR-W-001** — Domain devs author Feature/Service documents as `.feature.md` files: Markdown + YAML frontmatter (id, name, version, owner, preconditions) + NL-first body + optional inline JSON code blocks for runtime-typed parts.
- **FR-W-002** — Documents declare: experience, workflow narrative, preconditions, hints (sub-agents / skills / tools / atomic components to prefer, UI experience to compose).
- **FR-W-003** — Hot-reload of registry without redeploying the agent runtime.
- **FR-W-004** — **No compilation step.** The agent reads `.feature.md` directly as planner context (super-skill doc model). Inline JSON portions are validated for referential integrity at registration time (skill IDs, component IDs exist).
- **FR-W-005** — Prompt caching exploited at the planner — stable docs hit cache on every invocation after the first.

## FR-MOBILE — Mobile context awareness (new — per ADR-017)
- **FR-MOBILE-001** — Runtime detects mobile / tablet / desktop context: screen size, touch vs. pointer input, network class.
- **FR-MOBILE-002** — UI Composer is mobile-context-aware: composition adapts (atomic component selection, layout density, text length, touch-target sizes, side-panel vs. bottom-sheet).
- **FR-MOBILE-003** — Atomic component registry may include mobile variants (`ProductTile.mobile`, `ProductTile.desktop`); composer chooses appropriate variant.
- **FR-MOBILE-004** — Native shim per platform (iOS / Android) handles: launching the agent, providing app-screen state, routing native events (microphone, push notifications, biometrics).
- **FR-MOBILE-005** — Native SDKs (full per-platform) deferred to v1.5.

## FR-CHURN — Customer Churn ML Model (new — per ADR-016)
- **FR-CHURN-001** — Per-tenant churn model lives inside enterprise data plane (per ADR-006).
- **FR-CHURN-002** — Inputs: customer interaction profile + recent VoC signals + usage trajectory + feature exposure history.
- **FR-CHURN-003** — Output: P(churn | customer, feature) per (customer, candidate-feature) pair.
- **FR-CHURN-004** — Consumed by planner / composer at recommendation time to suppress / down-weight high-churn-risk features.
- **FR-CHURN-005** — Default model bundled with the platform; pluggable adapter for hosts with existing churn models.
- **FR-CHURN-006** — Cold start strategy when tenant has no historical churn data (use generic prior model + tenant-specific online learning as data accumulates).
- **FR-CHURN-007** — Threshold tuning per tenant or per customer-segment.
- **FR-CHURN-008** — Explainability: when the planner suppresses a feature, the rationale ("similar customers had X% churn after Y") is logged for product-team review.

## FR-QUOTA — End-user tier and quota system (new — per ADR-019)
- **FR-QUOTA-001** — Host enterprises define tiers (e.g., free / pro / enterprise / custom) with per-tier limits (requests/day, tokens/period, concurrent sessions).
- **FR-QUOTA-002** — Per-user request and token tracking (ClickHouse, telemetry-adjacent).
- **FR-QUOTA-003** — Quota enforcement modes per tier: hard limit / soft limit + warning / unlimited.
- **FR-QUOTA-004** — End-user visibility: composed UI element ("X requests remaining this period") rendered using host's atomic primitives + theme tokens; surfaced contextually (e.g., when user crosses 80% of quota).
- **FR-QUOTA-005** — Tier metadata exposed to host's billing system via webhook / API for upgrade flows.
- **FR-QUOTA-006** — Distinct from platform-vendor pricing (host pays vendor — separate concern).

> Each ID above is a **seed**, not a contract. As we groom, we refine, split, or kill them.
