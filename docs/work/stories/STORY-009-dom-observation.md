# STORY-009 — DOM observation (MO + IO + semantic events)

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-014 — Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md)

## User story

As the runtime planner, I want a stream of DOM mutation and intersection events from the host page, plus host-dispatched semantic events (e.g. `cart-item-added`), so that I can provide proactive and context-aware responses without the host needing to instrument every user action manually.

## Context

ADR-022 settled DOM observation as a prerequisite for proactive scoring. The shell attaches a `MutationObserver` to observed regions (product-grid, cart, etc.) and an `IntersectionObserver` for viewport-entry. Host pages can dispatch `CustomEvent('saasagent:event', { detail: { type, payload } })` for semantic events. The runtime ring-buffers these per-WS connection.

## Done when

- `web-shell/src/dom-observer.ts` emits `dom-mutation`, `dom-intersection`, and `dom-semantic` envelopes.
- Runtime ring-buffers them per-WS and surfaces them in `ComposeContext`.
- Verified end-to-end in browser: product-grid / cart / cart-summary mutations and `cart-item-added` semantic event observed in runtime logs.
- 8 web-shell + ring-buffer runtime tests added.
