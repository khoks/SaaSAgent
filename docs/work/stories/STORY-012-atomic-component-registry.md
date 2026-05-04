# STORY-012 — AtomicComponentRegistry store and REST API

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User story

As a host enterprise developer, I need a REST API to register my atomic UI primitives (React, WC, etc.) so that the HaikuComposer is constrained to only emit layout nodes using my registered vocabulary — preventing hallucinated component names.

## Done when

- `PUT /registry/components` registers a component (name, version, framework, props schema, description).
- `GET /registry/components` returns the full registry.
- HaikuComposer system prompt includes registry vocabulary; composer emits layout using only registered primitive names.
- 53 tests passing (6 new registry store tests).
- Chrome smoke: 6 e-commerce primitives registered; Haiku compose uses `PageHeading`, `BodyText`, `Card` (not placeholder `Text`/`Button`).

## Completion notes

Committed within build(phase-1.4.1) commit 54f4d9e (via extract-insights PR #11 note). CORS enabled for cross-origin requests from demo-host (5173 → 8080). Registry endpoints verified end-to-end in Chrome browser via Playwright MCP.
