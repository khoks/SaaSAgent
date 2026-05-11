---
# STORY-012 — KeyValueMemoryProvider + per-WS sessionId (Phase 2.3)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As an end-user, the agent remembers what I said earlier in a conversation — my follow-up messages ("Recommend me three more") are resolved against prior context without me repeating myself.

## Context
Phase 2.1 wired `NullMemoryProvider` (no-op). Phase 2.3 replaces it with `KeyValueMemoryProvider`: an in-memory map keyed by `sessionId`, storing full `PlanTurn[]` history. Each WebSocket connection gets its own unique `sessionId` assigned in `RuntimeServer`. `PlanRequest` and `SonnetPlanner` now carry `sessionId` so previous turns are injected into the multi-round tool-use loop. `/memory/:sessionId` REST endpoint exposes captured turns for inspection. Postgres persistence is deferred to Phase 4.

## Done when
- `KeyValueMemoryProvider` implements `MemoryProvider` interface with per-session `record` and `recall`.
- `PlanRequest.sessionId` threaded through `RuntimeServer` → `SonnetPlanner`.
- `/memory/:sessionId` REST endpoint returns all captured turns.
- `/health` includes `memoryProvider` name.
- 17+ new tests; cross-turn recall verified end-to-end.
- Live-verified: turn 1 ("I just watched Blade Runner") → turn 2 ("Recommend me three more") → planner correctly inferred genre from prior context and returned Blade Runner 2049, Ex Machina, Annihilation. All 4 turns captured under one session ID via `/memory` endpoint.

## Completion notes (2026-05-05)
Commit: `a8972e4`. 212 runtime tests green (+17 from 2.3). Memory continuity proven live — planner narration on turn 2 explicitly referenced "user's love of Blade Runner" demonstrating recall reached the reasoning loop.
