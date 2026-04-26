# Vision

> Long-form companion to [PLOT.md](../PLOT.md). PLOT is the elevator pitch; this is the executive briefing.

## Target state (3-year horizon)

A SaaS enterprise — Adobe, Canva, Expedia, Best Buy, Walmart, Shopify, or any other — adopts the SaaS Agent Platform as a **self-hosted dependency** they install end-to-end inside their own ecosystem. Within days, they have an embedded, branded, intelligent agent inside their web app and mobile app that:

- Knows who the user is, what they were doing 2 minutes ago, 2 days ago, and 2 months ago.
- Knows the user's interests, recurring pain points, abandoned workflows, and accepted vs. rejected past suggestions.
- Sees the user's current screen, can highlight elements, drive interactions, narrate, listen via microphone.
- Renders a scrolling stream of UI artifacts in its conversational pane that are **composed at runtime from the host's own design system primitives** — guaranteed on-brand because the agent's only UI vocabulary IS the host's design system.
- Plans and executes multi-step workflows by composing sub-agents, AI skills, and tools from the host's registries.
- Pops up proactively when a next-best-action is high-confidence.
- Has been configured by the host's domain developers via declarative Feature/Service documents — written in natural language or typed JSON — describing experiences, workflows, preconditions, and hints (which sub-agents/skills/tools to prefer, what UI experience to compose).

The host enterprise has not built any of this. They have only:
1. Installed the platform inside their own infrastructure.
2. Connected their event bus, customer profile store, and product usage store via adapters.
3. **Registered their atomic design-system components and theme tokens.**
4. Authored Feature/Service documents declaring their workflows.

All data, runtime, memory, and telemetry stays inside the enterprise's trust boundary. The platform vendor (us) operates no shared cloud holding enterprise data.

## Why now
- Foundation models are finally cheap, fast, and capable enough to run as a substrate, not a toy.
- Tool-use, structured outputs, multimodality, and long context are all production-ready.
- The pattern of "every SaaS bolts on a chatbot" has exhausted itself; the next wave is *intelligent agents inside the product*. None of these enterprises will build the substrate themselves correctly.
- Enterprise compliance posture is increasingly hostile to multi-tenant SaaS for AI workloads — self-hosted distribution removes the blocker.

## The wedge
Land with one vertical's design partner, prove the substrate is real, then expand horizontally.

**MVP anchor: E-commerce** (Walmart / Best Buy / Shopify-merchant-tier). See [ADR-003](decisions/decision-log.md). Selected for: broadest TAM, clearest ROI demo (cart abandonment, product discovery, returns/support), mature event-bus patterns.

Later verticals (post-MVP):
- **Travel** (Expedia, Booking) — multi-step planning, comparison, change/cancel — agent-shaped workflows.
- **Creative tools** (Adobe, Canva) — in-canvas guidance, skill discovery, undo of intent — multimodal-shaped.
- **B2B SaaS productivity** (Notion, Asana, Linear) — cross-document reasoning, workflow automation.

## Ultimate-aspirational target
The end-state is **a Google-app/OS-ecosystem-style universal agent surface** — a single agentic substrate capable of operating across every app and every surface a user touches, not just inside a single SaaS product. We design today with that horizon in mind even though MVP is a single embedded agent inside a single host. See [docs/requirements/future-requirements.md](requirements/future-requirements.md).

## Non-goals (clarifying boundaries)
- We are not building a foundation model.
- We are not building a generic LLM API.
- We are not building a no-code workflow tool for power users.
- We are not building a vertical assistant ourselves.
- We are not operating a multi-tenant SaaS.
- We are not generating raw UI markup — UI is always composed from host-registered design-system primitives.

## Open vision questions (Batch 2 of grooming — to be answered)
1. Memory store architecture (vector + KG + structured events; embeddable / pluggable since enterprise hosts it).
2. **Atomic-design-system registration protocol** — manual entries vs. auto-extraction from Storybook / Figma tokens / component metadata (or both)?
3. **Multi-framework component integration mechanism** — Module Federation? Universal renderer? Per-framework adapter?
4. Feature/Service document format — markdown with frontmatter? YAML? JSON? hybrid NL/JSON?
5. Mobile embedding strategy (React Native, native SDKs, WebView bridge).
6. Pricing model under self-hosted constraint (license / per-seat / capacity tier).
7. Proactive-engine confidence and attention-budget model.
8. Federated cross-enterprise learning — opt-in future capability for shared pattern improvements while preserving data isolation.

## Closed vision questions (Batch 1 — answered 2026-04-26)
- ✅ Design-partner vertical for MVP — **e-commerce** ([ADR-003](decisions/decision-log.md)).
- ✅ Embed surface — **Web Component shell with multi-framework component registry** ([ADR-004](decisions/decision-log.md)).
- ✅ UI rendering model — **runtime composition from host's atomic design system** ([ADR-005](decisions/decision-log.md)).
- ✅ Deployment model — **self-hosted only, end-to-end inside enterprise's ecosystem** ([ADR-006](decisions/decision-log.md)).
- ✅ Agent runtime — **Claude Agent SDK behind thin internal interface** ([ADR-007](decisions/decision-log.md)).
