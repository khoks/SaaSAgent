# STORY-017 — FeedbackBar widget + implicit re-ask signal (Phase 2.5.x)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Voice-of-customer capture loop closed at the UI layer:
- `FeedbackBar` web-component widget — thumbs-up / thumbs-down buttons rendered below each composed layout.
- Implicit re-ask: thumbs-down emits a `FeedbackEnvelope` over WS; planner treats it as a re-ask signal and recomposes.
- `FeedbackEnvelope` type added to protocol; runtime WS handler routes it to the planner.
- Web-shell tests: 8 new tests covering FeedbackBar render, click, and WS emit.

## Done when
- FeedbackBar renders in the shell after each layout.
- Thumbs-down triggers automatic re-plan + recompose without user typing.
- `FeedbackEnvelope` stored in session memory as negative signal for future turns.

## Result
Done. Commit `c2b2bfd`. FeedbackBar live; VoC capture loop closed.
