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

### Closed in Batch 6 (2026-05-06 — implementation phase, Phase 2–5)
- ✅ Real-time transport — SSE (planner→shell) + WebSocket (bidirectional interaction) [ADR-038]
- ✅ Text input affordance — shell ships `InputBar` as first-class input surface [ADR-039]
- ✅ Eval-feedback WS intercept — `eval-feedback` envelopes bypass planner, route directly to EvalProvider [ADR-040]
- ✅ Implicit re-ask eval signal — user message within N seconds of last layout broadcast → `negative/user-implicit` [ADR-041]
- ✅ Symmetric bidirectional federation — every runtime exposes `/federate` endpoint; any runtime can be sub-agent of another [ADR-042]
- ✅ WeightedFeatureChurnCalculator as MVP churn placeholder — parameterized linear model + sigmoid; defers full LightGBM to v1 [ADR-043]

### Still open (Batch 7 — remaining MVP + v1 scope)
1. **Cross-store consistency failure-recovery semantics**.
2. **Federated cross-enterprise learning (v2)** — opt-in mechanism design.
3. **Adapters registry transport** — how host event bus → platform Redpanda topic.
4. **Proactive engine** — multi-signal scoring + attention budget (ADR-018 decided, not yet built).
5. **Voice / multimodal I/O** — WebRTC Phase 5 (post-MVP).
6. **Full LightGBM churn model** — WeightedFeatureChurnCalculator is the MVP placeholder; real ADR-031 LightGBM model deferred to v1.
7. **VoC dashboard** — embedded SPA (ADR-030 decided, not yet built).
8. **Multi-framework WC rendering** — React + vanilla WC MVP shell renders plain DOM today; ADR-010/015 rendering adapter to be built.

## Implemented package structure (Phase 2–5)

The monorepo currently ships 8 packages under `packages/`:

| Package | Role |
|---|---|
| `protocol` | Shared TypeScript types (envelopes, descriptors, providers) |
| `runtime` | Core runtime: RuntimeServer, Planner, Composer, registries, memory, eval, churn |
| `web-shell` | Web Component shell: InputBar, FeedbackBar, render-modes, DOM observer, mobile-context |
| `sdk-ts` | TypeScript Sub-Agent SDK (`defineSubAgent()`) |
| `cli` | CLI: `saasagent` command — start, register, generate |
| `demo-ecommerce` | E-commerce demo vertical (Walmart/Best-Buy archetype) |
| `demo-travel` | Travel demo vertical (Expedia/Booking archetype) |
| `demo-host` | Dev host server for local development and demos |

## SonnetPlanner tool-mapper prefix scheme

The planner dispatches to the 3-tier capability model via namespaced prefixes:

| Prefix | Tier | Example |
|---|---|---|
| `skill__` | In-process skill handler | `skill__format-price` |
| `tool__` | HTTP tool (stateless API call) | `tool__fetch-product-info` |
| `subagent__` | Federated external runtime | `subagent__weather-specialist` |

## DOM observation implementation (ADR-022)

`dom-observer.ts` wires both `MutationObserver` and `IntersectionObserver`. Observed events are **ring-buffered per WS connection** (not forwarded live to the planner) to prevent flooding. Host-emitted semantic events use the `saasagent:event` custom event name on the host page. The runtime intercepts `dom-mutation`, `dom-intersection`, and `dom-semantic` envelope types and stores them in the ring buffer; the planner may query the buffer but is not interrupted per event.

## WC render modes (ADR-004)

Four modes implemented in `render-modes.ts`:

| Mode | Behaviour |
|---|---|
| `side-panel` | Default — fixed panel on page edge |
| `full-page` | Expands to fill viewport |
| `drawer` | Fixed bottom overlay |
| `eject` | Opens in a new `window.open` popup |

## Mobile context detection (ADR-017)

`mobile-context.ts` classifies on connect and on resize:
- `deviceClass`: `mobile` | `tablet` | `desktop`
- `viewportWidth`: current px
- `inputMode`: `touch` | `pointer`
- `networkClass`: `slow-2g` | `2g` | `3g` | `4g` | `unknown`

Threaded into `ComposeContext.mobileContext` so the composer can adapt layout density, component selection, and text length.

## Tech-stack decisions
See [tech-stack.md](tech-stack.md).
