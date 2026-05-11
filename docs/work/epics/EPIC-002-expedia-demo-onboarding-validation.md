# EPIC-002 — Expedia enterprise demo + onboarding validation

- **Status:** done
- **Completed:** 2026-05-11
- **Initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **PR:** khoks/SaaSAgent#30 (merged)

## Why
The generic e-commerce demo didn't stress-test the developer-onboarding path. Building a realistic "Expedia drops SaaSAgent into expedia.com" reference simultaneously validated Phase 2 capabilities (planning, skills, sub-agents, DOM observation) and surfaced concrete onboarding gaps that needed fixing before OSS publication.

## Done when
- `apps/demo-expedia/` reference integration is merged and buildable from a clean clone.
- All 5 onboarding gaps are closed.
- PR #30 merged to main.

## Children

| ID | Title | Status |
|---|---|---|
| [STORY-007](../stories/STORY-007-expedia-reference-integration.md) | Build Expedia reference integration | done |
| [STORY-008](../stories/STORY-008-close-onboarding-gaps.md) | Close 5 enterprise-onboarding gaps | done |
