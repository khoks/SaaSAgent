# ADR-009: DOM observation for ambient awareness

**Status:** accepted
**Decision date:** 2026-05-04

## Context

A prompt-driven agent only knows what the user types into the input bar.
But on a host SaaS the user is constantly DOING things — adding to cart,
filling forms, navigating between pages — and the agent should react to
those actions without requiring the user to type "hey, I just added a TV
to my cart."

Three signal sources matter on the DOM:

1. **Mutations** — content changes in flagged regions (cart total updated).
2. **Visibility** — the user dwelled on a flagged element for > N seconds.
3. **Semantic events** — host code dispatches a structured signal
   ("checkout-step-2-completed").

## Decision

**The shell installs three observers and emits typed envelopes for each.**

- `MutationObserver` on `data-saas-agent-observe` regions. Throttled
  (200ms default) and payload-bounded (1KB default) to prevent chatty pages
  from flooding the runtime. Emits `dom-mutation` envelopes.
- `IntersectionObserver` on `data-saas-agent-track-viewport` elements. 50%
  threshold + 1s dwell. Emits `dom-visibility` envelopes (visible=true on
  enter-with-dwell, false on exit).
- `document.addEventListener('saasagent:event')` listener relays
  `CustomEvent` detail as `dom-semantic` envelopes. Hosts dispatch these
  from their own code:
  ```js
  document.dispatchEvent(new CustomEvent('saasagent:event', {
    detail: { kind: 'cart-item-added', payload: { ... } }
  }));
  ```

**The runtime intercepts all three envelope types BEFORE the planner.**
They populate a per-WS ring buffer (20 deep, FIFO) the planner reads on its
next plan() — but they don't themselves trigger a compose cycle. This
prevents the agent from constantly re-rendering on every mouse move.

## Consequences

**Pro:**
- Hosts get ambient awareness with three CSS-style attributes — zero code
  in the typical case.
- The semantic-event channel is the canonical "host pushes a domain signal"
  path — hosts can describe what's happening in their own vocabulary.
- The 20-deep ring buffer keeps planner prompts bounded.

**Con:**
- Throttle + payload bound mean the planner sees an aggregated view of
  bursts, not every change. Acceptable: the planner cares about state
  transitions, not micro-animations.
- The host has to remember to emit semantic events for things that don't
  manifest as DOM changes (e.g. backend-driven state that's already shown).

## Implementation

- `packages/web-shell/src/dom-observer.ts` — MO + IO + custom-event listener.
- Runtime intercept in `packages/runtime/src/transport/server.ts`
  `handleWsConnection`.
