# STORY-008 — Render modes (side-panel / full-page / drawer / eject)

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-014 — Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md)

## User story

As a host app developer, I want to choose how the agent panel renders on my page (side panel, full-page overlay, drawer, or ejected popup window) so that the UX fits my product's layout and user flows.

## Context

ADR-004 confirmed the Web Component + shadow DOM approach. Render modes were listed as a Phase 1 extension. The four modes are:
- **side-panel** — fixed right-side column (default)
- **full-page** — fixed overlay covering the entire viewport
- **drawer** — overlay anchored to bottom, slides up
- **eject** — `window.open` popup (escape hatch for full-browser experiences)

## Done when

- `web-shell/src/render-modes.ts` implements all four modes.
- Host can switch mode via `<saas-agent render-mode="drawer" />` attribute.
- 8 web-shell tests added and passing.
