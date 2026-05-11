# STORY-007 — E2E browser smoke-test PASS

- **Status:** done
- **Completed:** 2026-05-10
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent epic:** [EPIC-010 — Expedia demo vertical (Phase 8)](../epics/EPIC-010-expedia-demo-vertical.md)

## What was verified

End-to-end Chrome test of the core SaaSAgent runtime + `apps/demo-ecommerce` demo, driven via Playwright MCP, confirmed PASS without an `ANTHROPIC_API_KEY` (StubComposer + StubPlanner fallback).

| # | Capability | Result |
|---|---|---|
| 1 | Build pipeline (`protocol`, `runtime`, `web-shell`) | PASS |
| 2 | Runtime boot on `:8080`, `/health` registry snapshot | PASS |
| 3 | SSE handshake → welcome layout rendered in right panel | PASS |
| 4 | User message → compose round-trip (stub response rendered) | PASS |
| 5 | DOM observation (MutationObserver + `saasagent:event` semantic events) | PASS |
| 6 | Explicit feedback (`thumbs-down` → `evalSignalCount` +1) | PASS |
| 7 | Implicit re-ask (second message within 8 s window → negative signal) | PASS |
| 8 | Cycle-id binding (P-001 patent mechanism) visible in runtime log | PASS |

## Notes

- P-004 (implicit-reask signal) verified live: `evalSignalCount 1 → 2` after rapid follow-up message within 8 s window.
- Compose-cycle-id appears on every event type (`dom-mutation`, `dom-visibility`, `mobile-context`, `user-message`).
