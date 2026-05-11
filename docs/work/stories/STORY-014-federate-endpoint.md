# STORY-014 — /federate endpoint — symmetric two-runtime federation (Phase 2.4.x)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As a sub-agent runtime, I need to expose a `/federate` HTTP endpoint so that any parent runtime can invoke me as a fully capable sub-agent — making federation symmetric rather than one-way.

## What was built
- `POST /federate` endpoint on RuntimeServer: receives `FederationRequest`, runs `planner.plan()` through full tool-use loop, returns `FederationResponse`
- 43 transport tests passing (including `/federate` integration tests)
- `pnpm demo:runtime` / `pnpm demo:runtime2` scripts for two-runtime local demo

## Verified
Live two-runtime demo: parent (8080) → child (8081) `/federate`. Child's runtime log: `[sonnet-planner] tool__fetch-weather({"city":"Tokyo"}) → ok (340ms)`. Browser-driven federation chain confirmed (parent: `subagent__weather-specialist(...) → ok 8164ms`, child: `tool__fetch-weather → ok 340ms`).

## Commit
`455e57a` on `main`
