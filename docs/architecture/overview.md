# Architecture Overview

> Living document. Auto-augmented by the `extract-insights` skill when conversations touch architecture.

## High-level layers (initial sketch)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          HOST SAAS (web + mobile)                      │
│   ┌────────────────────┐   ┌─────────────────────┐                     │
│   │ Host UI / DOM      │   │ Host event bus      │                     │
│   └────────────────────┘   └─────────────────────┘                     │
└────┬─────────────────────────────────┬─────────────────────────────────┘
     │ Embedded shell + observers      │ Adapters
     ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       SAAS AGENT PLATFORM (runtime)                    │
│                                                                        │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │ UI Shell    │  │ Conversa-   │  │ Multimodal  │  │ Proactive   │   │
│   │ (panel,     │  │ tional pane │  │ I/O (DOM,   │  │ engine      │   │
│   │ drawer,     │  │ + widget    │  │ mic, TTS,   │  │ (next-best- │   │
│   │ full, eject)│  │ stream      │  │ click)      │  │ action)     │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│           │              │                │                  │         │
│           └──────────────┴────────────────┴──────────────────┘         │
│                                  │                                     │
│   ┌──────────────────────────────▼──────────────────────────────┐      │
│   │           ORCHESTRATOR / PLANNER / THINKER                  │      │
│   │  ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────────┐  │      │
│   │  │ Planner │ │ Thinker │ │ Widget       │ │ Memory       │  │      │
│   │  │         │ │         │ │ selector     │ │ accessor     │  │      │
│   │  └─────────┘ └─────────┘ └──────────────┘ └──────────────┘  │      │
│   └─────────────────────────────────────────────────────────────┘      │
│                                  │                                     │
│   ┌──────────────────────────────▼──────────────────────────────┐      │
│   │                       REGISTRIES                            │      │
│   │ ┌────────┐ ┌──────────┐ ┌─────┐ ┌────────┐ ┌──────────────┐ │      │
│   │ │ Skills │ │ SubAgent │ │Tools│ │Widgets │ │Features/     │ │      │
│   │ │        │ │          │ │     │ │        │ │Services      │ │      │
│   │ └────────┘ └──────────┘ └─────┘ └────────┘ └──────────────┘ │      │
│   └─────────────────────────────────────────────────────────────┘      │
│                                  │                                     │
│   ┌──────────────────────────────▼──────────────────────────────┐      │
│   │   AI-NATIVE STORES & MEMORY (per-user, cross-session,       │      │
│   │   time-windowed: 2m / 10m / day / week / year)              │      │
│   └─────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

## Open architectural questions (active grooming)
1. **Runtime location** — Edge worker? Host-side server? Platform-side cloud? Hybrid? (Decision affects latency, data residency, multi-tenancy.)
2. **Widget protocol** — Server-driven UI (JSON spec → render), or shipped React components, or both?
3. **Memory store** — Vector DB only? Vector + KG? Vector + KG + structured events? Bring-your-own?
4. **Orchestration framework** — Build on Claude Agent SDK directly, on LangGraph, on bespoke runtime?
5. **Sub-agent isolation** — Process isolation? Iframe isolation? VM isolation? None?
6. **Eventing** — How does the agent observe DOM + host bus without becoming a permission nightmare?
7. **Feature/Service doc format** — Markdown with frontmatter? YAML? JSON? DSL?

## Tech-stack decisions
See [tech-stack.md](tech-stack.md). All TBD pending grooming.
