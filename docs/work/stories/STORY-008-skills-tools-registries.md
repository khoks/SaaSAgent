# STORY-008 — Skills and Tools registries (Phase 2.0b)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As a platform integrator, I can register named Skills (in-process capability definitions) and Tools (HTTP endpoint descriptors) at runtime so that the planner can discover and dispatch to them.

## Context
Phase 2 requires the planner to invoke capabilities. Before a planner can route, the runtime needs an authoritative registry of what capabilities are available. Skills are in-process (JavaScript functions); Tools are HTTP endpoints. Both share a `name → descriptor` store pattern.

## Done when
- `SkillsRegistry` and `ToolsRegistry` in-memory stores with CRUD.
- `GET /registry/skills` and `GET /registry/tools` REST endpoints.
- `PUT /registry/skills/:name` and `PUT /registry/tools/:name` REST endpoints.
- Protocol type extensions for skill/tool descriptors.
- 123 total tests green.

## Resolution (2026-05-05)
Shipped as Phase 2.0b. Commit: 68a606e (batched with 2.0a).
