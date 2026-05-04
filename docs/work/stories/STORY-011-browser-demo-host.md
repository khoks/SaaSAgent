# STORY-011 — Browser demo host with live Haiku compose

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User story

As a developer, I need a Vite-bundled browser demo (`apps/demo-host`) that embeds `<saas-agent>` in a mock host page so that the full loop can be verified in a real browser (Chrome), not just in JSDOM integration tests.

## Done when

- `pnpm demo:runtime` starts the runtime; `pnpm demo:host` starts Vite dev server at `localhost:5173`.
- `<saas-agent>` custom element connects to runtime over SSE + WS.
- Welcome layout renders: Card → Text → Button.
- Button click emits typed-JSON `acknowledge` instruction over WS; runtime re-composes + broadcasts; renderer re-renders.
- Chrome MCP screenshot and console logs confirm the full loop end-to-end.

## Completion notes

Committed d49241a (Phase 1.4.0). Chrome browser verified via Playwright MCP: SSE connect confirmed in runtime log, DOM walk confirmed welcome Card/Text/Button, click → WS → re-render cycle proven. StubComposer used when `ANTHROPIC_API_KEY` not in spawned env (expected).
