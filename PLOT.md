# PLOT — The SaaS Agent Platform

> The "plot" of this project: the single-page narrative of *what* we are building and *why*. Living document. Updated as the vision sharpens.

## One-line pitch
A **universal, embeddable agentic harness** that any SaaS enterprise can drop into their web/mobile product to give their customers a thinking, planning, observing, proactively-helpful agent — composed from the enterprise's own design system, running entirely inside the enterprise's ecosystem — that becomes **the primary interaction surface**, leaving the host's existing UI as the channel for admin / troubleshooting / legacy support ([ADR-034](docs/decisions/decision-log.md)).

## The problem
Every major SaaS today (Adobe, Canva, Expedia, Best Buy, Walmart, Shopify, …) is independently hand-rolling a half-baked AI assistant. Each rebuilds the same 80% substrate: orchestration, planning, widget composition, memory, tool/skill registries, observability into the user's session, multimodal I/O, proactive triggering. None of them get it right because it isn't their core competency.

## The bet
Stripe-for-payments / Auth0-for-auth / Twilio-for-comms — but distributed as a **self-hosted substrate** rather than a SaaS service. A platform that abstracts the universal substrate, leaves the SaaS-specific surface to the host enterprise via declarative registries, and ships out-of-the-box capabilities (memory, observation, narration, proactive nudges) that no single SaaS would build on its own.

## What it is, structurally

1. **Embeddable shell (Web Component)** — side panel, top-bar drawer, full page, ejectable. Hosts heterogeneous UI components from React / Vue / Svelte / Angular under one shell. Ships with an integration framework for two-way interaction with the host's UI framework.
2. **Runtime** — orchestration + planning + thinking + UI-composition layer (built on the Claude Agent SDK behind a thin internal interface so the substrate model can be swapped).
3. **Registries** — AI Skills, Sub-Agents, Tools, **Atomic UI Components** (the host's design-system primitives), **Theme & Branding tokens**, **Features/Services** (host-defined declarative workflow documents, in natural language or typed JSON).
4. **UI composition engine** — at runtime, the agent **composes** final UI artifacts in its scrolling conversational pane from the host's atomic components and theme tokens, based on conversation context, memory, and Feature/Service hints. **Data wiring across composed components is agent-determined.** Output is stylistically on-brand by construction (the agent's only vocabulary IS the host's design system).
5. **Memory** — per-user cross-session memory; SaaS-usage profile; 3rd-party app usage profile; AI-native time-windowed stores (last 2 m / 10 m / day / week / year). All stored inside the enterprise's data plane.
6. **Multimodal I/O** — DOM observation, microphone, narration (TTS), element highlight + click on host page.
7. **Protocols** — bidirectional **typed-JSON instruction emit** between UI ↔ runtime; runtime ↔ sub-agents/skills/tools; runtime ↔ host event bus. Domain-dev natural-language specs are compiled to the same typed JSON internally.
8. **Proactive engine** — detect next-best-action moments and open the conversation unprompted.
9. **Adapters** — per-host connectors for profile / event / usage data.

## What it is *not* (boundary line)
- Not a chatbot widget. Chatbots are reactive, stateless, and host-blind.
- Not an LLM router. The model is a substrate; the platform is the substrate around the substrate.
- Not a multi-tenant SaaS. The platform is **self-hosted in each enterprise's own ecosystem end-to-end** — no platform-side cloud holds enterprise data.
- Not a workflow tool for engineers (Zapier-like). It is for *end-users of SaaS products*, configured by domain devs at the host enterprise.
- Not a vertical-specific assistant. The platform is vertical-agnostic; verticals plug in via the Features/Services registry.
- Not a generative-UI engine that emits raw HTML/CSS. UI is **composed** from host-registered primitives — never generated free-form.

## MVP anchor
**Dual vertical: e-commerce + travel** ([ADR-033](docs/decisions/decision-log.md)). Walmart-/Best-Buy-style e-commerce AND Expedia-/Booking-style travel as composite design-partner archetype (real partner TBD). E-commerce stress-tests the proactive engine + cross-session re-engagement; travel stress-tests multi-step planning depth. The ultimate-aspirational target — **a Google-app/OS-ecosystem-style universal agent surface across every app a user touches** — is captured in [docs/requirements/future-requirements.md](docs/requirements/future-requirements.md).

## The grooming arc
1. **Vision** — articulate the target state (this doc + [docs/vision.md](docs/vision.md)).
2. **Requirements** — functional, non-functional, future ([docs/requirements/](docs/requirements/)).
3. **Architecture** — runtime, protocols, registries, stores ([docs/architecture/](docs/architecture/)).
4. **Decisions** — every load-bearing choice as an ADR ([docs/decisions/](docs/decisions/)).
5. **Novel ideas** — patentable / non-obvious concepts captured early ([docs/novel-ideas/](docs/novel-ideas/)).
6. **Work tracking** — initiatives → epics → stories → tasks ([docs/work/](docs/work/)).
7. **MVP** — the smallest demonstrable slice for the e-commerce anchor.

## Operating principles
- **Universality > vertical fit** at the platform layer; verticality lives in registries.
- **Declarative > imperative** for host-side configuration.
- **Composition > catalog** — UI is composed from the host's atomic primitives at runtime, not selected from a fixed widget catalog.
- **Stylistic guarantee by construction** — the agent's UI vocabulary is the host's design system, so every rendered artifact is on-brand by definition.
- **Memory is a product feature, not infrastructure** — exposed, queryable, debuggable.
- **Self-hosted by default** — the platform lives end-to-end inside the enterprise's ecosystem; no platform-side cloud holds enterprise data.
- **Proactive ≠ annoying** — proactivity is gated by attention budgets and confidence.
- **Typed-JSON contract end-to-end** — natural-language inputs are compiled in; runtime traffic is always typed.
- **Agent as primary interface** ([ADR-034](docs/decisions/decision-log.md)) — the experience bar is "faster, more intuitive, less limited than the host's UI"; host UI persists for admin/troubleshooting/legacy support only.

## Status
**Build phase started 2026-05-07.** 37 ADRs accepted. INIT-001 (vision/requirements grooming) complete. INIT-002 (MVP scope) accepted. INIT-003 (build) Phase 0 (foundation scaffolding) in progress. Build team: Rahul + Claude only ([ADR-036](docs/decisions/decision-log.md)). License: Apache 2.0 with provisional patent filings before OSS publication ([ADR-035](docs/decisions/decision-log.md)). Repo remains private until those filings land.
