# STORY-007 — Mobile-context detection envelope

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-014 — Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md)

## User story

As a host app embedded on a mobile device, I want the shell to measure device class, viewport width, input mode, and network class and send them to the runtime so the composer can produce a mobile-optimised layout without guessing.

## Context

ADR-017 settled the mobile embedding strategy (WebView bridge). This story implements the `mobile-context` envelope: the shell detects the four signals via browser APIs, packs them into a typed WS envelope, and the runtime intercepts it before the planner to thread `mobileContext` into `ComposeContext`.

## Done when

- `web-shell/src/mobile-context.ts` emits `mobile-context` envelope on connect and resize.
- Runtime intercepts `mobile-context` and stores per-connection.
- `ComposeContext.mobileContext` populated for every subsequent compose turn.
- 10 web-shell + 2 runtime tests added; 384 → 396 total passing.
