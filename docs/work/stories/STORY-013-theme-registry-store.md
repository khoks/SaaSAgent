# STORY-013 — ThemeRegistryStore and REST API

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User story

As a host enterprise developer, I need a REST API to register my DTCG theme tokens so that the HaikuComposer's system prompt includes my brand tokens and the composed layout JSON references my theme variables — ensuring composed artifacts are visually consistent with my host application.

## Done when

- `PUT /registry/theme` accepts a DTCG token object (colors, typography, spacing, etc.).
- `GET /registry/theme` returns the stored theme.
- HaikuComposer system prompt includes the active theme tokens alongside the component registry.
- 60+ tests passing.
- Chrome smoke: theme registered with e-commerce brand tokens; Haiku compose prompt includes theme context.

## Completion notes

Committed build(phase-1.4.2) commit a24a29c. Final state at end of session b2da6a2e — Phase 1 gate fully satisfied (end-to-end compose with real Anthropic API, registry-constrained, theme-aware, browser-verified).
