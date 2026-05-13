---
id: STORY-029
title: Proactive engine — multi-signal scoring + attention budget
status: done
epic: EPIC-011
created: 2026-05-12
last-updated: 2026-05-12
---

# STORY-029 — Proactive engine: multi-signal scoring + attention budget

- **Status:** done
- **Completed:** 2026-05-12
- **Created:** 2026-05-12
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-011 — Phase 5: Multimodal + proactive](../epics/EPIC-011-phase5-multimodal-proactive.md)
- **PR:** khoks/SaaSAgent#39 (merged 2026-05-12)
- **ADR:** ADR-038

## User story
As the host operator, I want the agent to proactively re-engage users during idle sessions based on contextual signals (DOM state, memory, time-since-last-interaction) without spamming them, so that day-2 re-engagement increases product engagement without degrading UX.

## What was built

| Layer | Deliverable |
|---|---|
| `packages/runtime/src/proactive/` | `ProactiveEngine` interface + `InMemoryProactiveEngine` with 6-signal scoring |
| 6 signals | `plannerConfidence`, `memoryMatch`, `workflowContinuity`, `domRelevance`, `timeSince`, `vocPainDensity` |
| Attention budget | Host-configurable max fires per conversation (default 3); hard cap prevents notification spam |
| Per-WS idle tick | 5 s interval in WS connect handler; calls `engine.evaluate()` per connected user; `lastUserMessageAt` tracked |
| `runProactiveTick` | Composes + broadcasts proactive layout when engine fires; tagged with proactive intent |
| `/health` | Exposes `proactiveEngine` registry snapshot |

## Tests
- 13 unit tests for `InMemoryProactiveEngine` (signal scoring, budget enforcement, cooldown)
- 3 server-integration tests (proactive tick fires, budget respected, no double-fire within cooldown)
- Total after: 504/504 green

## Live verification (Expedia demo)
Proactive layout fired without user input after ~8 s idle on the Expedia demo in Chrome. Panel rendered `"You asked: expedia:bundle-savings-nudge"`. Runtime log confirmed 2 fires respecting the budget=2 cap.

## Acceptance criteria
- [x] `ProactiveEngine.evaluate()` returns a non-null intent when signals cross threshold
- [x] Attention budget caps fires per conversation
- [x] Per-WS idle tick fires every 5 s and broadcasts layout on engine fire
- [x] Proactive layout verified live in Chrome (no user input)
- [x] 504/504 tests pass
