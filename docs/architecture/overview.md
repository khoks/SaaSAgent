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

### Still open (Batch 6 — implementation/v2 details, can groom in parallel with MVP build)
1. **Cross-store consistency failure-recovery semantics**.
2. **Federated cross-enterprise learning (v2)** — opt-in mechanism design.
3. ~~**Real-time transport**~~ ✅ **Closed** — SSE (server→shell) + WebSocket (shell↔runtime) [ADR-038].
4. **Adapters registry transport** — how host event bus → platform Redpanda topic (webhook / direct integration / SDK adapter library).

## Phase 0 scaffold (completed 2026-05-03)

Monorepo is bootstrapped and all gate checks pass. Package structure:

| Package | npm name | Purpose |
|---|---|---|
| `packages/runtime` | `@saasagent/runtime` | Core `Runtime` class + config interface; entry point for the platform process |
| `packages/sdk-ts` | `@saasagent/sdk` | TypeScript Sub-Agent SDK — `SubAgentDescriptor` type + `registerSubAgent` stub |
| `packages/web-shell` | `@saasagent/web-shell` | `<saas-agent>` custom element; side-panel placeholder; WC shell host |
| `packages/cli` | `@saasagent/cli` | `agentsaas` binary — `init` / `dev` / `registry` CLI stubs |
| `infra/docker-compose.yml` | — | Full polyglot dev stack: PG + Qdrant + Redpanda + ClickHouse + Neo4j (per ADR-032) |

Gate: `pnpm install && pnpm build && pnpm test` — all green (4/4 builds, 8/8 tests with `--passWithNoTests`). Runtime smoke (`[saasagent/runtime v0.0.0] starting`) and CLI smoke (`agentsaas --help / --version / init / dev / registry`) both pass.

**Source:** Session 2026-05-03 — Phase 0 implementation; commit 80da183.

## Phase 1 protocol + transport (completed 2026-05-03)

Three slices landed in the same session, all gates green (42 tests across 5 packages).

**Phase 1.1 — `@saasagent/protocol` + StubComposer + LayoutRenderer**

New shared package `packages/protocol` (`@saasagent/protocol`) defines the full typed-JSON contract between runtime and shell:

| Module | Defines |
|---|---|
| `version.ts` | `PROTOCOL_VERSION = '0.1.0'` |
| `layout.ts` | `LayoutNode`, `ComposedLayout`, `DataSource` (literal/memory/host-api/sub-agent/computed), `EmitSpec` |
| `instruction.ts` | `InstructionEnvelope`, `InstructionAck` (with `composeCycleId` for causality tracking) |
| `theme.ts` | DTCG-compatible token types (per ADR-025) |
| `atomic-component.ts` | `AtomicComponent` registry shape (per ADR-005, ADR-009) |
| `composer.ts` | `UIComposer` interface, `ComposeContext`, `MobileContext` |

`StubComposer` implements `UIComposer`, returns a hand-crafted `Card → Text → Button` layout for any intent. `LayoutRenderer` in `web-shell` walks a `ComposedLayout`, renders DOM nodes, subscribes to interaction events, emits `InstructionEnvelope` back to runtime.

**Phase 1.2 — Real SSE + WebSocket transport (closes ADR-038)**

Runtime HTTP server (`@saasagent/runtime`) exposes `GET /health`, `GET /sse` (planner → shell), `WS /ws` (bidirectional instruction channel). Full loop validated: SSE welcome layout → shell renders → click → WS emit → re-compose → SSE re-render.

**Phase 1.3 — HaikuComposer + ModelProvider abstraction + Zod output validation**

`StubComposer` replaced by `HaikuComposer`. New `ModelProvider` interface wraps Anthropic SDK (`AnthropicProvider`) + test double (`MockProvider`) — provider swap is one new class implementation. Composer pipeline: (1) CompositionCache lookup → return on hit; (2) `claude-haiku-4-5` call with cacheable system blocks; (3) `extractFirstJsonObject` + `Zod.safeParse`; (4) on failure → `claude-sonnet-4-6` with `thinking: {type: "adaptive"}` + re-parse; (5) throw with both error reasons if both fail. `composeCycleId` threads through for memory and observability. Schema design kept deliberately loose per ADR-039.

**Source:** Session 2026-05-03 — commits 5a4c97c (Phase 1.1), b796d02 (Phase 1.2), aed268f (Phase 1.3).

## Tech-stack decisions
See [tech-stack.md](tech-stack.md).
