# STORY-013 — Federated Sub-Agents (Phase 2.4)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As a platform operator, I need to register separate runtime processes as sub-agents so that the parent planner can delegate work to domain-specialist runtimes over HTTP, enabling true enterprise federation.

## What was built
- Protocol: `SubAgentDescriptor`, `SubAgentRegistry`, `FederationRequest`, `FederationResponse` envelope types
- `InMemorySubAgentRegistry` with tests
- `SubAgentExecutor` — HTTP fetch + federation envelope marshaling
- REST `/registry/subagents` (PUT/GET) + `/executor/subagent/<name>` endpoints
- `SonnetPlanner` extended: third tool-mapper prefix `subagent__<name>` → SubAgentExecutor dispatch
- 239 runtime tests passing post-2.4

## Verified
Live: parent planner dispatched `subagent__weather-specialist` → child runtime `/federate` → child planner → `tool__fetch-weather` (httpbin echo, 372ms). Two independent runtimes, each with its own planner+composer, federated.

## Commit
`21c1fde` on `main`
