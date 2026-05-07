# ADR-004: Render modes — side-panel, full-page, drawer, eject

**Status:** accepted
**Decision date:** 2026-04-18

## Context

The agent shell embeds inside host SaaS pages. Hosts have wildly different
layouts (single-page apps with fixed sidebars, full-page wizards, mobile
PWAs). One rendering posture doesn't fit all.

## Decision

**Four render modes, selectable via the `mode` attribute on `<saas-agent>`.**

- `side-panel` (default) — narrow column docked to the right of host content.
- `full-page` — agent fills the viewport (mobile-default friendly).
- `drawer` — fixed-positioned overlay slides in from the right; backdrop
  dims the host. Closes on backdrop-click.
- `eject` — `window.open()` a popup that re-uses the parent's `<saas-agent>`
  custom-element registration via `window.opener.customElements.get('saas-agent')`.
  Lets a user "rip the agent off" into its own window.

Mode changes are reactive — mutating the attribute re-renders.

## Consequences

**Pro:**
- One web component handles every embedding context.
- Mode is a host concern — the runtime is unaware. Any future mode (e.g.
  inline-card embedded in a page section) is shell-only work.

**Con:**
- The `eject` popup can't share state with the parent without `BroadcastChannel`
  (deferred; Phase 6.x adds session sync).
- Drawer mode covers part of the host — content beneath is inert until
  closed. Some hosts want a non-modal slide-in. Acceptable trade-off.

## Implementation

- `packages/web-shell/src/render-modes.ts` — pure styling + popup launch.
- `packages/web-shell/src/index.ts` — SaaSAgentShell selects via `getMode()`.
