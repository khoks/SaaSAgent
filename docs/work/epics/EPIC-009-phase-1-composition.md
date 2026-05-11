# EPIC-009 — Phase 1 Composition layer

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Full bidirectional typed-JSON composition loop running in a real browser: HaikuComposer reads the AtomicComponent registry + Theme registry, produces a LayoutTree via the Anthropic API, the web-shell custom element renders it, user clicks/text emit InstructionEnvelopes back over WebSocket, and error conditions surface gracefully via ErrorEnvelope.

## Why
Phase 1 is the proof that the substrate (typed layout protocol + provider-abstracted LLM + registry-driven composition) actually works end-to-end in a browser — not just in unit tests.

## Done when
- Protocol package with LayoutNode / InstructionEnvelope / ErrorEnvelope types.
- Real SSE transport for planner output + WebSocket for instruction emit.
- AnthropicProvider + HaikuComposer with MockProvider fallback.
- AtomicComponentRegistry and ThemeRegistry with REST APIs and CORS.
- Style Dictionary importer + CSS variable fallback for theme tokens.
- Vite-bundled `apps/demo-host` verified live in Chrome.
- 105+ tests green.

## Resolution (2026-05-05)
Phase 1 gate passed. Phases 1.1–1.4.4 all shipped and Chrome-verified. Final commit: 31da46a. 105 tests passing.

## Sub-phases shipped
| Phase | Description | Commit |
|---|---|---|
| 1.1 | Protocol package + JSDOM renderer | 5a4c97c |
| 1.2 | Real SSE + WebSocket transport | b796d02 |
| 1.3 | AnthropicProvider + HaikuComposer | aed268f |
| 1.3.1 | ErrorEnvelope + SSE error events | d39e3d4 |
| 1.4.0 | Vite demo-host browser app | d49241a |
| 1.4.1 | AtomicComponentRegistry REST API | 54f4d9e |
| 1.4.2 | ThemeRegistry + DTCG importer | _(batched)_ |
| 1.4.3 | Shell error banner | e813673 |
| 1.4.4 | Style Dictionary importer + CSS vars | 31da46a |

## Child stories
_(tracked at epic level — Phase 1 is done)_
