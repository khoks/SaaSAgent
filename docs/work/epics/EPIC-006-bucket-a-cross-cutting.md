# EPIC-006 — Bucket A cross-cutting capabilities

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Mobile-context detection, render modes, DOM observation (MutationObserver + IntersectionObserver + semantic events), Sub-Agent SDK, CLI enhancements, and both demo vertical apps (e-commerce + travel). End-to-end verified live in Chrome including DOM semantic events forwarded over WS with compose-cycle-id binding (P-001).

## Why
These capabilities span multiple phases and ADRs but were grouped for efficient delivery. They extend the substrate from a pure-HTTP demo to a real embedded SaaS agent with contextual awareness.

## Done when (all satisfied)
- ✅ Mobile-context detection: `deviceClass` / `viewportWidth` / `inputMode` / `networkClass`; shell sends on connect + resize; threaded into `ComposeContext.mobileContext` (ADR-017)
- ✅ Render modes: side-panel, full-page, drawer (fixed overlay), eject (window.open popup) (ADR-004)
- ✅ DOM observation: MutationObserver + IntersectionObserver; custom `saasagent:event` semantic channel; dom-mutation / dom-visibility / dom-semantic envelopes forwarded over WS (ADR-022)
- ✅ Sub-Agent SDK (`@saasagent/sdk-ts`) with federation types + boilerplate
- ✅ CLI: `agentsaas init` scaffolding; enhanced commands
- ✅ `apps/demo-ecommerce`: e-commerce mock host with atomic primitives + semantic cart events
- ✅ `apps/demo-travel`: travel mock host with itinerary/flight primitives
- ✅ Compose-cycle-id causality binding verified live: all WS events tagged with cycle-id from most recent SSE broadcast (P-001)
- ✅ 468 tests across 8 packages

## Commit
- `c46a366` — build(phase-5): Bucket A + B
