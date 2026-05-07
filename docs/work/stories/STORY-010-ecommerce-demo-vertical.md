---
id: STORY-010
title: E-commerce demo host + primitives + sub-agent
status: backlog
epic: EPIC-014
created: 2026-05-06
last-updated: 2026-05-06
---

# STORY-010 — E-commerce demo host + primitives + sub-agent

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-014 — Phase 8: Demo verticals](../epics/EPIC-014-phase8-demo-verticals.md)

## User story
As a demo presenter, I need the 10-beat e-commerce demo script to execute reliably end-to-end so that the wow target is demonstrable to prospective design partners.

## Context
Anchor vertical: Walmart/Best-Buy-style e-commerce (per ADR-033 + INIT-002). Atomic primitive stubs partially shipped in EPIC-011; this story polishes to demo quality.

## Done when
- `apps/demo-ecommerce` mock host app runs cleanly via Docker Compose.
- Atomic primitives registered: ProductTile, ComparisonGrid, FilterBar, ThemeTokens.
- E-commerce feature doc (`ecommerce.feature.md`) covers TV upgrade + cart flows.
- Python recommendation Sub-Agent federates over gRPC, push-registers, mTLS handshakes.
- Price-comparison Skill wired and executes.
- All 10 beats of the e-commerce demo script execute reliably without intervention.
- 2-day proactive re-engagement beat works.
