# EPIC-003 — Phase 1 Composition

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

End-to-end composed artifact renders in a real browser via a live Anthropic API call. WC shell connects to runtime over SSE + WebSocket; HaikuComposer composes a `LayoutTree` constrained to registered atomic primitives and theme tokens; bidirectional typed-JSON instruction loop proven.

## Phase 1 gate (from INIT-003)

End-to-end composed artifact renders from a hand-crafted / Haiku-composed layout-tree input.

**Gate passed:** session b2da6a2e (2026-05-04) — Chrome browser verified full loop including live Anthropic API call, registry-constrained compose, and click → WS re-compose cycle.

## Sub-slices completed

| Slice | Commit | Result |
|---|---|---|
| 1.1 Protocol + stub composer + renderer | 5a4c97c | 18 tests across 5 packages; full LayoutTree → DOM walk validated in JSDOM |
| 1.2 SSE + WebSocket real transport | b796d02 | 29 tests; curl smoke: SSE connect + WS bidirectional proven |
| 1.3 AnthropicProvider + HaikuComposer | aed268f | 42 tests; ModelProvider abstraction; live API smoke validated |
| 1.3.1 ErrorEnvelope + SSE error propagation | d39e3d4 | 47 tests; `composer-error` SSE event + client `onServerError` |
| 1.4.0 Browser demo host (apps/demo-host) | d49241a | Vite-bundled `<saas-agent>` in mock host page; pnpm demo:runtime + demo:host |
| 1.4.1 AtomicComponentRegistry + REST API | 54f4d9e (via) | 53 tests; PUT/GET /registry/components; composer constrained to registry vocab |
| 1.4.2 ThemeRegistryStore + REST API + composer | a24a29c | 60+ tests; DTCG theme tokens in PUT/GET /registry/theme; composer prompt includes theme |

## Child stories

- [STORY-008 — Protocol typed-JSON schema package](../stories/STORY-008-protocol-schema-package.md)
- [STORY-009 — Real SSE and WebSocket transport](../stories/STORY-009-sse-websocket-transport.md)
- [STORY-010 — HaikuComposer with Anthropic provider](../stories/STORY-010-haiku-composer-anthropic.md)
- [STORY-011 — Browser demo host with live Haiku compose](../stories/STORY-011-browser-demo-host.md)
- [STORY-012 — AtomicComponentRegistry store and REST API](../stories/STORY-012-atomic-component-registry.md)
- [STORY-013 — ThemeRegistryStore and REST API](../stories/STORY-013-theme-registry-store.md)
