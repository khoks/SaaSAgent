---
id: TASK-007
title: QuotaBanner web-shell widget
status: done
story: STORY-009
created: 2026-05-11
last-updated: 2026-05-11
---

# TASK-007 — QuotaBanner web-shell widget

- **Status:** done
- **Completed:** 2026-05-11
- **Commit:** `d041f2e`
- **Parent story:** [STORY-009 — Visible "X requests remaining" composed UI element](../stories/STORY-009-xremaining-ui-element.md)

## What was done

- Added `QuotaBanner` custom element (`<quota-banner>`) to `packages/web-shell`.
- Constructed in `SaaSAgentShell.attachClient()` and updated on every incoming layout.
- Three visual states driven by `quotaStatus.state`:
  - `fine`: banner hidden or neutral gray with "N of M requests remaining"
  - `warning`: amber background, shown when ≤20% remaining
  - `exceeded`: red background, "Quota exceeded. … Resets at <datetime>."
- Wired into `packages/web-shell` index; re-exported from runtime package.
- Verified live in Chrome with `apps/demo-expedia`: all three states cycled through by sending 5 messages.
- 71/71 web-shell tests pass.
