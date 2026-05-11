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

## Planner → Composer data bridge (`ComposeContext.toolResults`)

Implemented in Phase 2.1c and live-verified. After the SonnetPlanner completes its multi-round tool_use loop, the tool execution results (`ToolExecutionResult[]`) are captured in `PlanResponse.toolResults`. `RuntimeServer` threads these through `ComposeContext` so the `HaikuComposer` receives them as first-class inputs alongside conversation history. The composer can therefore incorporate discovered data (e.g., fetched product info, sub-agent responses) into the composed `LayoutTree` without re-invoking tools. This decouples the planning phase (tool dispatch) from the composition phase (UI generation) while preserving information flow between them.

```
SonnetPlanner (multi-round tool_use loop)
        │
        │  PlanResponse { intent, toolResults[], sessionId }
        ▼
RuntimeServer
        │  ComposeContext { history, toolResults[], theme, features }
        ▼
HaikuComposer
        │  LayoutTree (references host atomic components; data from toolResults)
        ▼
WC Shell renderer
```

## Bidirectional typed-JSON instruction protocol

- **Schema-first.** All UI ↔ runtime traffic is typed JSON. Domain-dev natural-language specs in Feature/Service docs are compiled to the same typed JSON at registration time.
- **Causality-tracked.** Every emit carries the parent compose-cycle ID for memory + observability.
- **Replayable.** Memory captures the full trajectory: composed artifact → user interaction → re-plan → next artifact.

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

### Closed in Phase 1.2 / Q6.3 (2026-05-08)
- ✅ Real-time transport — SSE (planner output → shell) + WebSocket (bidirectional instruction emit); WebRTC reserved for voice (Phase 5) [ADR-038]

### Closed during MVP build phases (2026-05-06)
- ✅ Shell render modes — four postures: `side-panel` (default), `full-page`, `drawer`, `eject` (window.open popup re-using parent's custom-element registration) [ADR-039]
- ✅ DOM observation ring buffer — per-WS 20-entry FIFO populated by MO/IO/semantic envelopes; consumed on next planner call; does NOT trigger compose cycles autonomously [ADR-040]
- ✅ Runtime API auth — pluggable `AuthProvider` (NoAuth / Bearer / JWT HS256/RS256) with tenancy threading through principal to multi-tenant registries [ADR-041]
- ✅ Implicit negative eval signal — re-ask within `RASK_WINDOW_MS` (default 8s) of a layout broadcast → `negative/user-implicit` EvalSignal on the prior `composeCycleId` [ADR-042]
- ✅ Churn model stepping-stone — `WeightedFeatureChurnCalculator` (logistic-regression–shaped, warm-startable via `trainChurnWeights()`) bridges rule-based and LightGBM (ADR-031) [ADR-042]
- ✅ Symmetric federation — `/federate` REST endpoint on any runtime lets it act as a sub-agent of another runtime; two-runtime live demo verified (parent 8080 → child 8081 → child's own tool). Any runtime is both orchestrator and delegate.

### Still open (v2 details)
1. **Cross-store consistency failure-recovery semantics**.
2. **Federated cross-enterprise learning (v2)** — opt-in mechanism design.
3. **Adapters registry transport** — how host event bus → platform Redpanda topic (webhook / direct integration / SDK adapter library).
4. **`eject` render mode BroadcastChannel session sync** — popup and parent window currently share no state; deferred to Phase 6.x.

## Enterprise integration reference pattern (`apps/demo-expedia/`)

Established 2026-05-10 during the Expedia E2E validation session. The canonical enterprise onboarding footprint:

```
apps/demo-expedia/
  server/start-runtime.mjs       ← ~30 lines: import @saasagent/runtime, register skills + sub-agent descriptor, start()
  server/start-trip-planner.mjs  ← ~30 lines: defineSubAgent(), register skills, start() on port 8082
  public/api/                    ← mock REST endpoints (flights, hotels, activities)
  index.html + src/host.ts       ← host page: imports <saas-agent-shell>, registers features/tools via postMessage
  vite.config.ts                 ← standard Vite config for the host SPA
```

Key verified properties:
- **Skills registration**: 5 Expedia-domain skills registered in-process at runtime init; discoverable at `GET /skills`.
- **Sub-agent federation**: trip-planner on port 8082 registered as a descriptor; platform federates to it via `POST /federate`.
- **Semantic DOM events**: host page emits `saasagent:event { kind: "flight-shortlisted", payload: {...} }` — runtime receives + tags with `composeCycleId`.
- **Graceful stub fallback**: all functionality above (capability registry, REST endpoints, WS/SSE, DOM observation, eval signals) works without `ANTHROPIC_API_KEY`; Planner + Composer fall back to Stub implementations. `/health` exposes `mode: "stub"` + `devHint` block with curl examples + registered-skill list.
- **Pre-handshake event queue**: WS events emitted before the handshake completes are queued; flushed on first layout broadcast with `composeCycleId` rebound. Prevents data loss on fast-loading host pages.

## REST endpoint surface (as of 2026-05-10)

Executor endpoints — all accept POST, body = flat input object (NOT `{input:{...}}`):

| Path | Alias(es) | Description |
|---|---|---|
| `POST /executor/skill/<name>` | `/skills/<name>/execute` | Run a registered skill directly |
| `POST /executor/tool/<name>` | `/tools/<name>/execute` | Run a registered tool directly |
| `POST /federate` | `/agents/<name>/federate` | Invoke the sub-agent federation path |
| `GET /skills` | — | List registered skills + descriptors |
| `GET /tools` | — | List registered tools |
| `GET /subagents` | — | List registered sub-agent descriptors |
| `GET /health` | — | Runtime health; includes `mode`, `devHint` block in stub mode |

Invalid input wrapping (`{input:{...}}`) now returns HTTP 400 with `{error, detail, example}` showing the correct curl shape.

## Tech-stack decisions
See [tech-stack.md](tech-stack.md).
