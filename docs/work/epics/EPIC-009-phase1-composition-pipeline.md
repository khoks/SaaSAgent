---
id: EPIC-009
title: Phase 1 — WC shell + composition pipeline
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-06
---

# EPIC-009 — Phase 1: WC shell + composition pipeline

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

End-to-end composed artifact renders from a hand-crafted layout-tree input through the WC shell. Phase 1 gate passed.

## Key deliverables (commits in session)
| Sub-phase | Capability |
|---|---|
| 1.1 | `@saasagent/protocol` package — bidirectional typed-JSON instruction protocol + StubComposer + layout renderer; full loop validated |
| 1.2 | Real SSE + WebSocket transport — full bidirectional loop validated over live network |
| 1.3 | HaikuComposer — real Anthropic Composer, provider abstraction, Zod-validated JSON, cache |
| 1.3.1 | SSE composer-error events + ErrorEnvelope + live API smoke validated end-to-end |
| 1.4.0 | `apps/demo-host` — Vite-bundled browser demo running the loop end-to-end |
| 1.4.1 | AtomicComponentRegistry store + REST API; composer consumes registry + CORS |
| 1.4.2 | ThemeRegistryStore + REST /registry/theme + composer prompt includes theme tokens |
| 1.4.3 | Shell renders error banner on ErrorEnvelope, clears on next successful layout |
| 1.4.4 | Style Dictionary + CSS variables importers — closes Phase 1.4 |

## Phase 1 gate
End-to-end composed artifact renders from hand-crafted plan. ✅
