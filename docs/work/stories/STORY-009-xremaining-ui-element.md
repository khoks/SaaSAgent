---
id: STORY-009
title: Visible "X requests remaining" composed UI element
status: done
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-11
---

# STORY-009 — Visible "X requests remaining" composed UI element

- **Status:** done
- **Completed:** 2026-05-11
- **Created:** 2026-05-06
- **Last updated:** 2026-05-11
- **Commit:** `d041f2e`
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As an end user, I want to see "X requests remaining" in the agent UI when I approach my quota threshold so that I understand my usage before being blocked.

## Context
Per ADR-019, a composed UI element surfaces contextually when the user crosses 80% of their tier limit. The composer receives quota context and renders from the host's atomic design system primitives.

## What shipped
`QuotaBanner` custom element in `packages/web-shell`. On every compose layout the shell reads `quotaStatus` from the payload and renders the banner:
- **Fine** (hidden or gray): "4 of 5 requests remaining today (free tier)"
- **Warning** (amber, ≤1 remaining): "1 of 5 requests remaining today (free tier)"
- **Exceeded** (red): "Quota exceeded. You've used 5/5 requests today on the free tier. Resets at …"

All three states verified live in Chrome with the Expedia demo integration.

## Done when (original criteria)
- [x] Quota percentage injected into `ComposeContext` at each turn.
- [x] When quota >= 80%, banner shows warning state; at 100% shows exceeded state.
- [x] WC shell renders the QuotaBanner using built-in styles (no host primitive required).
- [x] Phase 7 gate satisfied: crossing threshold triggers visible element render.
