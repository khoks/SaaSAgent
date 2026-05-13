# STORY-007 — Build Expedia reference integration

- **Status:** done
- **Epic:** [EPIC-002 — Expedia enterprise demo + onboarding validation](../epics/EPIC-002-expedia-demo-onboarding-validation.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-12
- **PR:** khoks/SaaSAgent#30

## User story
As an enterprise developer evaluating SaaSAgent, I can clone `apps/demo-expedia/` and see a fully working travel-vertical integration that shows me exactly how to wire up skills, sub-agents, DOM observation, and semantic events — in 30 lines of boilerplate.

## What was built
A self-contained reference at `apps/demo-expedia/` representing "Expedia drops SaaSAgent into expedia.com":

| File | Role |
|---|---|
| `server/start-runtime.mjs` | Expedia data-plane runtime on `:8080`; registers 5 in-process skills + 1 sub-agent descriptor. 30-line boilerplate. |
| `server/start-trip-planner.mjs` | Trip-planner sub-agent on `:8082` via `@saasagent/sdk` declarative `defineSubAgent`. Owns `build-itinerary`. |
| `index.html` | Host page with branded Expedia UI, flight/hotel/activities tabs, shortlist panel. |
| `host.js` | Semantic event emitters (`flight-shortlisted`, `hotel-shortlisted`, `activity-shortlisted`), DOM region tagging, capability pre-seeding. |
| `public/api/` | Mock REST APIs for flights, hotels, activities. |

## Scenarios tested live in Chrome

- Skill execution: `search-flights`, `search-hotels`, `check-availability`, `get-weather`, `convert-currency`
- Sub-agent: trip-planner registered + `/federate` invoked (stub-mode graceful empty)
- DOM observation: flight/hotel/activity shortlist semantic events forwarded over WS with compose-cycle-id binding
- Round-trip composed UI: renders inside the `<saas-agent />` right panel

## Acceptance criteria
- [x] All 5 skills discoverable via `GET /registry/capabilities`
- [x] Sub-agent descriptor registered in `GET /registry/sub-agents`
- [x] DOM semantic events forwarded with correct `composeCycleId` binding
- [x] Trip shortlist panel accumulates all 4 shortlists via agent panel
- [x] Builds clean (`pnpm build`) and starts without errors
