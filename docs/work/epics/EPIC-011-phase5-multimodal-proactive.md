---
id: EPIC-011
title: Phase 5 — Multimodal + proactive + Sub-Agent SDK + providers (Bucket A+B)
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-12
---

# EPIC-011 — Phase 5: Multimodal + proactive + Sub-Agent SDK + providers (Bucket A+B)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

Phase 5 Bucket A+B shipped. Mobile-context detection, render modes, Sub-Agent SDK (TS + Python), CLI, demo verticals, Qdrant/ClickHouse/Kafka/Neo4j provider implementations.

## Key deliverables (commit `c46a366`)
| ADR | Capability | Tests |
|---|---|---|
| **017** | Mobile-context detection — deviceClass / viewportWidth / inputMode / networkClass; shell→runtime envelope intercept threaded into ComposeContext.mobileContext | 10 + 2 |
| **004** | Render modes — side-panel, full-page, drawer (fixed/absolute/popover) | included |
| — | Sub-Agent SDK — TS + Python SDKs with boilerplate templates + `agentsaas init sub-agent` | included |
| — | CLI (`@saasagent/cli`) expanded — full `agentsaas` binary with sub-commands | included |
| — | Demo verticals — e-commerce + travel atomic primitives, themes, feature docs | included |
| **032** | Qdrant / ClickHouse / Kafka / Neo4j provider implementations | included |

## Additional deliverables (PR #39, 2026-05-12)

| ADR | Capability | Tests |
|---|---|---|
| **038** | `ProactiveEngine` + `InMemoryProactiveEngine`: 6-signal scoring (planner-conf, memory-match, workflow-continuity, DOM-relevance, time-since, VoC-pain-density) | 13 unit |
| — | Per-WS idle tick (5 s interval) — fires `engine.evaluate()` per connected user | 3 server-integration |
| — | Attention budget (host-configurable, default 3 fires/conversation); hard cap prevents spam | included |
| — | `runProactiveTick` wired in WS connect handler; lastUserMessageAt tracked per WS | included |

**Live verification:** proactive layout fired without user input after ~8 s idle on Expedia demo in Chrome — layout showed `"You asked: expedia:bundle-savings-nudge"`. Engine log showed 2 fires respecting the budget cap.

## Phase 5 gate
Day-2 proactive re-engagement demo runs end-to-end. ✅ **2026-05-12 — multi-signal scoring engine verified live in Chrome with Expedia demo.** See [STORY-029](../stories/STORY-029-proactive-engine-implementation.md).
