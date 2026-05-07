# STORY-015 — Symmetric /federate endpoint (Phase 2.4.x)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Symmetric federation: each runtime can act as both orchestrator and sub-agent:
- `POST /federate` endpoint — receives a `FederateRequest` (intent + context) from a parent runtime, runs local planner + composer, returns `FederateResponse` (layout + tool results).
- Demo script starts two runtime instances; instance A registers instance B, then dispatches to it; B answers with a composed layout; A merges B's result.
- Two-runtime live federation verified in Chrome.

## Done when
- `/federate` endpoint accepts inbound planner dispatch from any parent runtime.
- Two-runtime demo runs reliably end-to-end without manual intervention.
- Tests cover both the endpoint handler and the `SubAgentExecutor` → `/federate` call path.

## Result
Done. Commit `455e57a`. Symmetric federation live; two-runtime Chrome demo confirmed.
