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

## Open architectural questions (Batch 2)

1. **Atomic-design-system registration format** — Storybook-CSF? CDD JSON schema? Custom DSL?
2. **Theme-tokens schema** — Style Dictionary? Adobe Spectrum tokens? CSS variables?
3. **Multi-framework rendering** — Module Federation? Wrap each framework as Web Components? Universal renderer per framework?
4. **Feature/Service doc format** — Markdown w/ frontmatter? YAML? JSON? Hybrid NL/JSON?
5. **Memory store architecture** — vector DB + KG + structured events; embeddable so enterprise can host.
6. **Time-windowed-behavior store** — separate primitive vs. summarization tiers in a unified store?
7. **Sub-agent isolation** — process / iframe / VM / none?
8. **Eventing model for DOM observation** — MutationObserver + IntersectionObserver + custom?
9. **UI-Composer LLM step** — same model as planner? Smaller faster model? Cached layout templates per intent?
10. **Federated cross-enterprise learning** — opt-in mechanism design.

## Tech-stack decisions
See [tech-stack.md](tech-stack.md).
