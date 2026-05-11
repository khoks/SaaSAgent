# STORY-008 — Expedia enterprise-developer reference integration

- **Status:** in-progress
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent epic:** [EPIC-010 — Expedia demo vertical (Phase 8)](../epics/EPIC-010-expedia-demo-vertical.md)

## What was built

A complete `apps/demo-expedia/` directory demonstrating how an enterprise developer onboards SaaSAgent for a travel booking context.

| File | Role |
|---|---|
| `server/start-runtime.mjs` | Expedia runtime on `:8080` — registers 5 in-process skills + 1 sub-agent descriptor (~30 lines) |
| `server/start-subagent.mjs` | Trip-planner sub-agent on `:8082` — registers `plan-trip` skill |
| `server/mock-api.mjs` | Mock Expedia REST endpoints (flights, hotels, activities, booking) |
| `src/expedia-host.ts` | Host-page bootstrap: loads `@saasagent/web-shell`, seeds tools + features, wires DOM observer |
| `src/expedia.feature.md` | Feature document consumed by the runtime planner |
| `public/` | Expedia-branded HTML + CSS |

## Scenarios tested in Chrome

- Flight search with price + duration filters
- Hotel shortlisting with stay-date selection
- Activity browsing (sightseeing, dining)
- Multi-leg trip summary via trip-planner sub-agent
- DOM semantic events (`flight-shortlisted`, `hotel-shortlisted`) flowing through data-plane and logged with cycle-id binding

## Done when

All five onboarding gaps (STORY-009) resolved and the 10-beat demo script runs without intervention.
