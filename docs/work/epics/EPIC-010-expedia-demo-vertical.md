# EPIC-010 — Expedia demo vertical (Phase 8)

- **Status:** in-progress
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

A self-contained `apps/demo-expedia/` reference that demonstrates how an enterprise developer (e.g., Expedia) installs and configures SaaSAgent for a real travel booking context — with branded UI, domain skills, a sub-agent, and realistic user scenarios validating the full data-plane.

## Why

Phase 8 requires demo verticals per INIT-003 plan. An Expedia-style travel integration stresses the developer-onboarding surface (skill registration, sub-agent federation, DOM observation, semantic events) and surfaces concrete gaps before OSS publication.

## Done when

- `apps/demo-expedia/` builds, starts, and passes the scenario suite without intervention.
- All five surfaced onboarding gaps are resolved or accepted as known limitations.
- Demo script executes the 10-beat travel scenario reliably.

## Child stories

- [STORY-007 — E2E browser smoke-test PASS](../stories/STORY-007-e2e-browser-smoke-test.md)
- [STORY-008 — Expedia enterprise-developer reference integration](../stories/STORY-008-expedia-reference-integration.md)
- [STORY-009 — Resolve sub-agent federation onboarding gaps](../stories/STORY-009-subagent-federation-gaps.md)
