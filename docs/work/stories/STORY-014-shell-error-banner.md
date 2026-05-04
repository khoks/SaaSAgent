# STORY-014 — Shell renders inline error banner on composer failure

- **Status:** done
- **Created:** 2026-05-08
- **Last updated:** 2026-05-08
- **Completed:** 2026-05-08
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User-visible behaviour

When the composer fails (network error, API error, schema validation failure), the embedded `<saas-agent>` WC shell renders an inline error banner inside its panel instead of silently hanging or crashing. The banner is cleared automatically on the next successful compose cycle.

## Done when

- Shell handles `onServerError` callback and renders a visible error state.
- Error clears on next successful `onLayout` event.
- Covered by tests and validated in real browser.

## Phase reference

Phase 1.4.3 — commit e813673

## Result

- Tests: 96+ passing (was 75 after 1.4.2).
- Shell `ErrorBanner` renders inline in `<saas-agent>` panel on `composer-error` SSE events.
- Verified in Chrome via Claude Preview MCP tool.
