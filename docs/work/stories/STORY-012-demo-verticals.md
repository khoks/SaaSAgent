# STORY-012 — Demo verticals e-commerce and travel

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-014 — Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md)

## User story

As a prospective design partner or investor, I want two runnable demo apps — a TV/electronics e-commerce catalog and a multi-leg flight search — so that I can see the agent operating in realistic SaaS host environments with real DOM observation, cart events, and mobile-context signals.

## Context

INIT-002 anchored the MVP around an e-commerce design-partner archetype with travel as a secondary vertical. Phase 8 in INIT-003 described full demo polish; this story covers the initial implementation of both host apps and their feature registries, ahead of the full Phase 8 polish sprint.

## Done when

- `apps/demo-ecommerce`: TV catalog + cart with `saasagent:event` semantic events dispatched on add-to-cart.
- `apps/demo-travel`: multi-leg flight search UI with agent panel embedded.
- Both apps build clean and start without errors.
- Browser-verified: `dom-mutation` + `dom-semantic` + `mobile-context` envelopes visible in runtime logs during e-commerce demo.
