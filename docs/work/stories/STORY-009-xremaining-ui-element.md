---
id: STORY-009
title: Visible "X requests remaining" composed UI element
status: backlog
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-06
---

# STORY-009 — Visible "X requests remaining" composed UI element

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As an end user, I want to see "X requests remaining" in the agent UI when I approach my quota threshold so that I understand my usage before being blocked.

## Context
Per ADR-019, a composed UI element surfaces contextually when the user crosses 80% of their tier limit. The composer receives quota context and renders from the host's atomic design system primitives.

## Done when
- Quota percentage injected into ComposeContext at each turn.
- When quota >= 80%, composer includes a "X remaining" UI element in the layout tree.
- WC shell renders the element using a host-registered QuotaIndicator primitive (or fallback).
- Phase 7 gate satisfied: crossing 80% threshold triggers visible element render.
