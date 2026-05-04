# Architecture Overview

> Living document. Auto-augmented by the `extract-insights` skill when conversations touch architecture.

## Deployment posture (ADR-006)

The platform is **self-hosted end-to-end inside the enterprise's ecosystem**. There is no platform-side cloud, no multi-tenant control plane, no shared data plane. The platform vendor ships versioned releases; the enterprise operates them.

**Implications:**
- Every deployment is single-tenant by definition; we do not write multi-tenancy code at the platform level.
- Compliance posture is the enterprise's, not ours.
- Foundation-model access is via the enterprise's own provider account (Anthropic API direct, or via Bedrock / Vertex / Azure-hosted Claude).
- Cross-tenant learning is impossible by default; an opt-in federated mode is a future capability.
- Distribution is software-vendor-style: versioned releases, on the enterprise's upgrade cadence.

## High-level layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  ENTERPRISE'S ECOSYSTEM (self-hosted)                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                  HOST SAAS (web + mobile)                       │    │
│  │   ┌──────────────────┐   ┌─────────────────┐                    │    │
│  │   │ Host UI / DOM    │   │ Host event bus  │                    │    │
│  │   └──────────────────┘   └─────────────────┘                    │    │
│  └────┬─────────────────────────────────┬──────────────────────────┘    │
│       │ Embedded WC shell + DOM observers│ Adapters                      │
│       ▼                                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   SAAS AGENT PLATFORM (runtime)                 │    │
│  │                                                                 │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │    │
│  │  │ WC SHELL   │  │ Conversa-  │  │ Multimodal │  │ Proactive  │ │    │
│  │  │ (panel,    │  │ tional pane│  │ I/O (DOM,  │  │ engine     │ │    │
│  │  │ drawer,    │  │ + composed │  │ mic, TTS,  │  │            │ │    │
│  │  │ full,eject)│  │ UI stream  │  │ click)     │  │            │ │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │    │
│  │         │              │                │                │      │    │
│  │         └──────────────┴────────────────┴────────────────┘      │    │
│  │                              │                                  │    │
│  │  ┌───────────────────────────▼──────────────────────────────┐   │    │
│  │  │           ORCHESTRATOR / PLANNER / THINKER               │   │    │
│  │  │   (built on Claude Agent SDK behind thin interface)      │   │    │
│  │  │                                                          │   │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌────────────┐ │   │    │
│  │  │  │ Planner │ │ Thinker │ │ UI Composer  │ │ Memory     │ │   │    │
│  │  │  │         │ │         │ │ (composes    │ │ accessor   │ │   │    │
│  │  │  │         │ │         │ │ from host DS)│ │            │ │   │    │
│  │  │  └─────────┘ └─────────┘ └──────────────┘ └────────────┘ │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  │                              │                                  │    │
│  │  ┌───────────────────────────▼──────────────────────────────┐   │    │
│  │  │                       REGISTRIES                         │   │    │
│  │  │ ┌────────┐ ┌──────────┐ ┌─────┐ ┌───────────────────┐    │   │    │
│  │  │ │ Skills │ │ SubAgent │ │Tools│ │ Atomic UI         │    │   │    │
│  │  │ └────────┘ └──────────┘ └─────┘ │ Components +      │    │   │    │
│  │  │ ┌──────────────────────────────┐│ Theme & Branding  │    │   │    │
│  │  │ │ Features / Services          ││ tokens            │    │   │    │
│  │  │ │ (NL or typed JSON)           │└───────────────────┘    │   │    │
│  │  │ └──────────────────────────────┘                         │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  │                              │                                  │    │
│  │  ┌───────────────────────────▼──────────────────────────────┐   │    │
│  │  │   AI-NATIVE STORES & MEMORY (per-user, cross-session,    │   │    │
│  │  │   time-windowed: 2m / 10m / day / week / year)           │   │    │
│  │  │   — persisted inside enterprise's data plane             │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## The UI composition pipeline (the heart of ADR-005)

This is the architectural pillar that distinguishes the platform from existing patterns.

```
User turn / proactive trigger
        │
        ▼
   Planner (Claude Agent SDK on top)
        │
        ▼
   UI Composer (separate LLM step)
   ┌─────────────────────────────────────────────────────────────────┐
   │  Inputs:                                                        │
   │    • Conversation context + memory                              │
   │    • Atomic UI Components registry (host's design system)       │
   │    • Theme & Branding tokens                                    │
   │    • Feature/Service hints (NL → typed JSON internally)         │
   │                                                                 │
   │  Output: typed-JSON layout tree referencing host components,    │
   │          with data wiring spec                                  │
   └─────────────────────────────────────────────────────────────────┘
        │
        ▼
   WC Shell renderer
   ┌─────────────────────────────────────────────────────────────────┐
   │  • Mounts referenced host components (multi-framework)          │
   │  • Applies theme tokens                                         │
   │  • Injects data per wiring spec                                 │
   │  • Subscribes to interaction events from each component         │
   └─────────────────────────────────────────────────────────────────┘
        │
        ▼
   User interacts
        │
        ▼  typed-JSON instruction emit
   Back to runtime → re-plan → next composed artifact
```

## Bidirectional typed-JSON instruction protocol

- **Schema-first.** All UI ↔ runtime traffic is typed JSON. Feature/Service docs are read directly by the planner as context (no compilation per ADR-013); inline typed-JSON escape hatches in those docs are validated at registration time for registry-reference integrity only.
- **Causality-tracked.** Every emit carries the parent compose-cycle ID (`composeCycleId` in `InstructionEnvelope`) for memory + observability — every user action is traceable to the compose cycle that rendered the widget.
- **Replayable.** Memory captures the full trajectory: composed artifact → user interaction → re-plan → next artifact.

## `@saasagent/protocol` — canonical typed-JSON wire format (Phase 1.1)

`packages/protocol` (`@saasagent/protocol`) is the single source of truth for all typed-JSON contracts. Every other package imports from here; no type duplication across packages is permitted.

| Type | Purpose |
|---|---|
| `LayoutNode` | One node in the composed layout tree — component ID, props (via `DataSource`), emit spec |
| `ComposedLayout` | Full artifact emitted by the UIComposer — array of `LayoutNode`s + metadata |
| `DataSource` | How a prop value is sourced: `literal \| memory \| host-api \| sub-agent \| computed` (expression TBD per ADR-039) |
| `EmitSpec` | When/what to emit from a user interaction — event type, payload shape, `debounceMs` (kept; guards double-click) |
| `InstructionEnvelope` | Shell → runtime interaction emit; carries `composeCycleId` for causality tracking |
| `InstructionAck` | Runtime acknowledgment of a processed instruction |
| `UIComposer` | Interface all composer implementations satisfy; parameterized by `ComposeContext` + `MobileContext` |
| `AtomicComponent` | Registry schema entry for a design-system primitive (per ADR-005, ADR-009) |
| `EmitTransport` | Transport abstraction shared by the `LayoutRenderer` (web-shell) and the runtime client — decouples both from the specific SSE/WS implementation |
| DTCG types | W3C Design Tokens Canonical Group representation (per ADR-025) |

**Key design choices:**
- `EmitTransport` lives in `@saasagent/protocol` (not in a consumer package) so both the renderer and the runtime client reference the same interface without a dependency cycle.
- `DataSource.computed` expression string is deliberately unspecified at MVP — see ADR-039.
- `InstructionEnvelope.composeCycleId` makes every user action traceable to the compose cycle that rendered the interacted widget, enabling memory trajectory reconstruction and observability.

**Source:** Conversation 2026-05-03, Phase 1.1 build: "Phase 1 slice 1.1 done and pushed"; schema confirmed in Phase 1.1/1.2 design review with Rahul.

## Memory architecture

See dedicated doc: [memory.md](memory.md). Polyglot, phased — Postgres + Qdrant at MVP; ClickHouse + Neo4j added at v1; federated learning state at v2. Per [ADR-008](../decisions/decision-log.md). Continuous derivation pipeline reads from the PG raw log and writes to: profiles, time-tiered summaries, problem-solution graph, eval datapoints, telemetry, voice-of-customer aggregations.

## Open architectural questions (Batch 3)

### Closed in Batch 2 (2026-04-26)
- ✅ DS registration intake — hybrid (manual + Storybook + metadata + augmentation) [ADR-009]
- ✅ Multi-framework rendering — WC-wrap default + native escape hatch [ADR-010]
- ✅ Feature/Service doc format — `.feature.md` (MD + frontmatter + inline JSON) [ADR-011]
- ✅ Memory architecture — polyglot phased (PG + Qdrant → +ClickHouse + Neo4j) [ADR-008]
- ✅ UI Composer LLM — Haiku + cached templates + Sonnet fallback [ADR-012]

### Closed in Batch 3 (2026-04-28)
- ✅ Feature/Service consumption model — read directly as super-skill doc, no compilation [ADR-013]
- ✅ Stream processing — Redpanda from MVP [ADR-014]
- ✅ MVP framework scope — React + vanilla WC only; Vue/Svelte/Angular at v1.5 [ADR-015]
- ✅ Voice-of-Customer — multi-surface configurable + closed-loop reprocessing into agent decision-making (with new Customer Churn ML Model component) [ADR-016]
- ✅ Mobile embedding — WebView bridge with mobile-context-aware composition [ADR-017]
- ✅ Proactive engine — multi-signal scoring + combined attention budget [ADR-018]
- ✅ End-user tier/quota system — configurable + visible "X requests remaining" surface [ADR-019]

### Closed in Batch 4 (2026-05-01)
- ✅ Platform-vendor pricing — open-core hybrid: free OSS + paid Enterprise subscription + paid Capacity tiers unlocking high-novelty features [ADR-020]
- ✅ Sub-agent execution model — **federated independent runtimes** built by domain teams via SDK + boilerplate, registered into Sub-Agent registry (NOT in-process isolated workers); crystallizes three-tier capability model: Tools / Skills / Sub-Agents [ADR-021]
- ✅ DOM observation eventing — MO + IO + custom semantic event channel via separate **Adapters registry** [ADR-022]
- ✅ Eval — hybrid scoring + auto-generated per-capability eval from registry metadata + bundled backend + dashboard [ADR-023]
- ✅ Embedding model — host-supplied via adapter (required for production); bundled `nomic-embed-text-v1.5` for dev/demo [ADR-024]
- ✅ Theme/branding — DTCG canonical + Style Dictionary importer + CSS variable fallback [ADR-025]

### Closed in Batch 5 (2026-05-04)
- ✅ Distribution / packaging — Docker Compose (dev/demo) + Helm chart (prod) at MVP [ADR-026]
- ✅ Sub-Agent SDK languages — TypeScript + Python at MVP [ADR-027]
- ✅ Sub-Agent federation protocol — HTTP REST (admin) + gRPC bidirectional streaming (runtime) [ADR-028]
- ✅ Sub-Agent discovery + authn — push self-registration + mTLS, intranet trust model [ADR-029]
- ✅ Eval dashboard — bundled SPA at MVP + optional exporters at v1 [ADR-030]
- ✅ Customer Churn ML Model — LightGBM + pluggable adapter + generic-prior cold-start [ADR-031]

### Closed in Batch 6 (2026-05-03)
- ✅ Real-time transport — SSE (planner output stream → shell) + WebSocket (bidirectional instruction emit); WebRTC reserved for voice Phase 5 [ADR-038]

### Still open (Batch 6 — v1/v2 details, groom in parallel with MVP build)
1. **Cross-store consistency failure-recovery semantics**.
2. **Federated cross-enterprise learning (v2)** — opt-in mechanism design.
3. **Adapters registry transport** — how host event bus → platform Redpanda topic (webhook / direct integration / SDK adapter library).

## Tech-stack decisions
See [tech-stack.md](tech-stack.md).
