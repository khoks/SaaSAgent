---
id: STORY-009
title: Visible "X requests remaining" composed UI element
status: done
epic: EPIC-013
created: 2026-05-06
last-updated: 2026-05-12
---

# STORY-009 — Visible "X requests remaining" composed UI element

- **Status:** done
- **Completed:** 2026-05-12
- **Created:** 2026-05-06
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-013 — Phase 7: Tier/quota enforcement](../epics/EPIC-013-phase7-tier-quota.md)

## User story
As an end user, I want to see "X requests remaining" in the agent UI when I approach my quota threshold so that I understand my usage before being blocked.

## Context
Per ADR-019, a composed UI element surfaces contextually when the user crosses 80% of their tier limit. The composer receives quota context and renders from the host's atomic design system primitives.

## What was built (PR #33)
- `QuotaBanner` web-shell widget with three states: gray (fine), amber (warning ≥80%), red (exceeded).
- `QuotaStatus` type in `@saasagent/protocol`; attached to every `ComposedLayoutMetadata`.
- Runtime enforces quota before planner invocation; denied turns compose a `quota-exceeded` layout, skipping the planner.
- Banner hidden when no `TierProvider` is registered.

## Done when (original)
- Quota percentage injected into ComposeContext at each turn. ✅
- When quota >= 80%, composer includes a "X remaining" UI element in the layout tree. ✅ (QuotaBanner in web-shell)
- WC shell renders the element using a host-registered QuotaIndicator primitive (or fallback). ✅
- Phase 7 gate satisfied: crossing 80% threshold triggers visible element render. ✅ verified live in Chrome
