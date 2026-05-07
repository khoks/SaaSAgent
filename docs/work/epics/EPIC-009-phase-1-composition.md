# EPIC-009 — Phase 1 — Composition

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

End-to-end composed artifact renders from a hand-crafted layout-tree input. WC shell, atomic registry, theme tokens, UI Composer, and bidirectional typed-JSON protocol all operational. 105 tests passing.

## Phase
Phase 1 — Composition

## Includes
- WC shell `<saas-agent />` side-panel render mode
- Atomic UI Components registry schema + storage + hot-reload
- Theme tokens registry (DTCG canonical + Style Dictionary importer + CSS variable fallback)
- UI Composer: Haiku + cached layout templates per intent + Sonnet fallback
- Bidirectional typed-JSON instruction protocol (SSE streaming + WS emit)
- Native-renderer escape hatch primitive
- AnthropicModelProvider: streaming text, tool_use, ErrorEnvelope
- HaikuComposer with live Anthropic API integration (2.5 s smoke)

## Gate result
Phase 1 gate passed — 105 tests, all registries + composer working, live API smoke.
