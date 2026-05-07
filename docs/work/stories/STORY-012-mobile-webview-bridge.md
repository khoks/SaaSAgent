---
id: STORY-012
title: Mobile WebView bridge + context-aware composition
status: backlog
epic: EPIC-015
created: 2026-05-06
last-updated: 2026-05-06
---

# STORY-012 — Mobile WebView bridge + context-aware composition

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-015 — Phase 9: Mobile + distribution + IP gate](../epics/EPIC-015-phase9-mobile-distribution-ip.md)

## User story
As a host mobile developer, I need native iOS and Android shims that bridge the WC shell into a WebView so that the agent runs natively in the host's mobile app with mobile-context-aware composition visibly different from desktop.

## Context
Mobile-context detection (deviceClass/viewportWidth/inputMode/networkClass) shipped in EPIC-011 (Phase 5 Bucket A+B, ADR-017). This story delivers the native bridge shims and validates the full mobile-context pipeline end-to-end on device.

## Done when
- iOS Swift shim and Android Kotlin shim ship, embedding `<saas-agent />` in a WebView.
- Mobile-context envelope injected by native shim overrides shell-detected context.
- Composer produces visibly different layout for mobile vs. desktop (e.g. stacked vs. side-by-side, touch-friendly affordances).
- Demo runs on Android + iOS in both e-commerce + travel verticals.
- INIT-002 acceptance criterion satisfied: "Mobile WebView demo runs on Android + iOS, mobile-context-aware composition visibly different from desktop."
