# EPIC-014 — Bucket A: Foundation capabilities sprint

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

Six ADR-driven capabilities shipped in one uninterrupted sprint (commit `c46a366`): mobile-context detection, render modes, DOM observation, Sub-Agent SDK, CLI verbs, and both demo verticals. These items were previously gated as "Bucket A — significant engineering work the vision depends on."

## Why

After Phase 2 completed with 384 tests, a gap audit against the 38 ADRs revealed these six items as the highest-priority remaining work before an investor-ready demo was possible. All items were implemented and verified end-to-end in the browser.

## Done when

- All six STORY items implemented, tested, and committed.
- 468 tests passing across 8 packages (confirmed via `pnpm test`).
- E-commerce demo verified end-to-end in browser showing `dom-mutation`, `mobile-context`, and `dom-semantic` envelopes.

## Child stories

- [STORY-007 — Mobile-context detection envelope](../stories/STORY-007-mobile-context-detection.md)
- [STORY-008 — Render modes (side-panel / full-page / drawer / eject)](../stories/STORY-008-render-modes.md)
- [STORY-009 — DOM observation (MO + IO + semantic events)](../stories/STORY-009-dom-observation.md)
- [STORY-010 — Sub-Agent SDK defineSubAgent](../stories/STORY-010-sub-agent-sdk.md)
- [STORY-011 — CLI init / registry / eval verbs](../stories/STORY-011-cli-verbs.md)
- [STORY-012 — Demo verticals e-commerce and travel](../stories/STORY-012-demo-verticals.md)
