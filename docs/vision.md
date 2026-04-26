# Vision

> Long-form companion to [PLOT.md](../PLOT.md). PLOT is the elevator pitch; this is the executive briefing.

## Target state (3-year horizon)

A SaaS enterprise — Adobe, Canva, Expedia, Best Buy, Walmart, Shopify, or any other — adopts the SaaS Agent Platform as a dependency the way they adopt Stripe, Auth0, or Datadog today. Within days, they have an embedded, branded, intelligent agent inside their web app and mobile app that:

- Knows who the user is, what they were doing 2 minutes ago, 2 days ago, and 2 months ago.
- Knows the user's interests, recurring pain points, abandoned workflows, and accepted vs. rejected past suggestions.
- Sees the user's current screen, can highlight elements, drive interactions, narrate, listen via microphone.
- Renders a scrolling stream of theme-matched, interactable widgets in its conversational pane — each widget emits agentic instructions back into the runtime.
- Plans and executes multi-step workflows by composing sub-agents, AI skills, and tools from the host's registries.
- Pops up proactively when a next-best-action is high-confidence — not as a notification, but as a conversation opener.
- Has been configured by the host's domain developers via declarative Feature/Service documents, not custom code.

The host enterprise has not built any of this. They have only:
1. Installed the platform.
2. Connected their event bus, customer profile store, and product usage store via adapters.
3. Authored Feature/Service documents declaring their workflows.
4. Branded the widget themes.

## Why now
- Foundation models are finally cheap, fast, and capable enough to run as a substrate, not a toy.
- Tool-use, structured outputs, multimodality, and long context are all production-ready.
- The pattern of "every SaaS bolts on a chatbot" has exhausted itself; the next wave is *intelligent agents inside the product*. None of these enterprises will build the substrate themselves correctly.

## The wedge
Land with one vertical's design partner, prove the substrate is real, then expand horizontally. Verticals with high signal:
- **E-commerce** (Walmart, Best Buy, Shopify merchants): cart abandonment, product discovery, returns/support — clear ROI.
- **Travel** (Expedia, Booking): multi-step planning, comparison, change/cancel — agent-shaped workflows.
- **Creative tools** (Adobe, Canva): in-canvas guidance, skill discovery, undo of intent — multimodal-shaped.

(Selection of design partner vertical is an open grooming question — see decision log.)

## Non-goals (clarifying boundaries)
- We are not building a foundation model.
- We are not building a generic LLM API.
- We are not building a no-code workflow tool for power users.
- We are not building a vertical assistant ourselves.

## Open vision questions (to be groomed)
1. Design-partner vertical for MVP?
2. Single-tenant deployment per enterprise vs. multi-tenant SaaS for the platform itself?
3. White-label SDK vs. iframe vs. web-component vs. all-three?
4. Pricing model (per-seat / per-conversation / per-token / hybrid)?
5. Data residency posture (does the platform hold any host data, or stay stateless to host stores)?
