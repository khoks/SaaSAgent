# STORY-014 — Federated sub-agents HTTP tier (Phase 2.4)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Third capability tier (alongside Skills + Tools): federated Sub-Agents over HTTP:
- `SubAgentDescriptor` + `SubAgentRegistry` protocol types.
- `InMemorySubAgentRegistry` with CRUD REST endpoints (`PUT/GET/DELETE /registry/sub-agents/:id`).
- `SubAgentExecutor` — HTTP client that dispatches to a registered sub-agent's endpoint and surfaces results as `ExecutionResult`.
- `SonnetPlanner` tool-mapper extended to expose sub-agents as callable tools.
- Live Chrome demo: planner dispatches to a second runtime instance acting as a sub-agent.

## Done when
- Sub-agents registerable via REST; planner can invoke them.
- Two-runtime federation works end-to-end in Chrome.
- `ExecutionResult` shape uniform across all three tiers.

## Result
Done. Commit `21c1fde`. Federated sub-agents HTTP tier live; three-tier capability model operational.
