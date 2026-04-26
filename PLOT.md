# PLOT — The SaaS Agent Platform

> The "plot" of this project: the single-page narrative of *what* we are building and *why*. Living document. Updated as the vision sharpens.

## One-line pitch
A **universal, embeddable agentic harness** that any SaaS enterprise can drop into their web/mobile product to give their customers a thinking, planning, observing, proactively-helpful agent — without each enterprise re-inventing the substrate.

## The problem
Every major SaaS today (Adobe, Canva, Expedia, Best Buy, Walmart, Shopify, …) is independently hand-rolling a half-baked AI assistant. Each rebuilds the same 80% substrate: orchestration, planning, widget rendering, memory, tool/skill registries, observability into the user's session, multimodal I/O, proactive triggering. None of them get it right because it isn't their core competency.

## The bet
Stripe-for-payments / Auth0-for-auth / Twilio-for-comms — and now: **a Stripe-equivalent for in-product agentic experiences**. A platform that abstracts the universal substrate, leaves the SaaS-specific surface to the host enterprise via declarative registries, and ships out-of-the-box capabilities (memory, observation, narration, proactive nudges) that no single SaaS would build on its own.

## What it is, structurally
1. **Embeddable shell** — side panel, top-bar drawer, full page, ejectable.
2. **Runtime** — orchestration + planning + thinking + widget-selection layer.
3. **Registries** — AI Skills, Sub-Agents, Tools, UI Widgets, Features/Services (host-defined declarative workflows).
4. **Memory** — per-user cross-session memory; SaaS-usage profile; 3rd-party app usage profile; AI-native time-windowed stores (last 2m / 10m / day / week / year).
5. **Multimodal I/O** — DOM observation, microphone, narration (TTS), element highlight + click.
6. **Protocols** — UI ↔ runtime, runtime ↔ sub-agents/skills/tools, runtime ↔ host event bus.
7. **Proactive engine** — detect next-best-action and surface unprompted.
8. **Adapters** — per-host connectors for profile/event/usage data.

## What it is *not* (boundary line)
- Not a chatbot widget. Chatbots are reactive, stateless, and host-blind.
- Not an LLM router. The model is a substrate; the platform is the substrate around the substrate.
- Not a workflow tool for engineers (Zapier-like). It is for *end-users of SaaS products*, configured by domain devs at the host enterprise.
- Not a vertical-specific assistant. The platform is vertical-agnostic; verticals plug in via the Features/Services registry.

## The grooming arc
1. **Vision** — articulate the target state (this doc + `docs/vision.md`).
2. **Requirements** — functional, non-functional, future (`docs/requirements/`).
3. **Architecture** — runtime, protocols, registries, stores (`docs/architecture/`).
4. **Decisions** — every load-bearing choice as an ADR (`docs/decisions/`).
5. **Novel ideas** — patentable / non-obvious concepts captured early (`docs/novel-ideas/`).
6. **Work tracking** — initiatives → epics → stories → tasks (`docs/work/`).
7. **MVP** — the smallest demonstrable slice with one design-partner vertical.

## Operating principles
- **Universality > vertical fit** at the platform layer; verticality lives in registries.
- **Declarative > imperative** for host-side configuration.
- **Composable widgets > monolithic UIs** — every UI surface emits agentic instructions.
- **Memory is a product feature, not infrastructure** — exposed, queryable, debuggable.
- **Proactive ≠ annoying** — proactivity is gated by attention budgets and confidence.

## Status
Day 0 — grooming. See `docs/decisions/decision-log.md` for the chronological record.
