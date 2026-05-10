# STORY-009 — Resolve sub-agent federation onboarding gaps

- **Status:** backlog
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent epic:** [EPIC-010 — Expedia demo vertical (Phase 8)](../epics/EPIC-010-expedia-demo-vertical.md)

## Context

Five concrete gaps were surfaced during the Expedia E2E session (2026-05-10). All are documented here as work to resolve before Phase 8 is declared done.

## Gaps

| # | Gap | Observed |
|---|---|---|
| 1 | `/federate` returns `{}` when sub-agent planner is Stub (no LLM) | Sub-agent responds but no invocations fire; output empty |
| 2 | Skill executor path mismatch | Dev docs implied `POST /executor/skill` body `{input:...}`; actual is `POST /executor/skill/<name>` with input as body root |
| 3 | No explicit error/fallback message when LLM key missing in sub-agent | Silent stub fallback is confusing to developers expecting partial output |
| 4 | Sub-agent registration discovery (host-side) not surfaced in `/health` | Enterprise dev must know the sub-agent port ahead of time |
| 5 | Demo script timing dependency | Implicit re-ask path (8 s window) is brittle in automated test runs |

## Done when

- Each gap has either a code fix or an explicit "accepted limitation" ADR note.
- Developer quickstart guide updated to reflect correct skill executor path.
- Automated integration test covers the `/federate` stub-fallback path explicitly.
