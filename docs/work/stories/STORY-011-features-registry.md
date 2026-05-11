---
# STORY-011 — Features registry as planner super-skill context (Phase 2.2)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Completed:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As an enterprise developer, I can register `.feature.md` documents at runtime so the Planner gains domain knowledge without tool calls — producing more accurate, grounded responses from intent alone.

## Context
Phase 2.1 wired the Planner + tool-use loop. Phase 2.2 adds the Features/Services registry: `.feature.md` files parsed as super-skill docs and injected into the SonnetPlanner system prompt. No compilation step; the planner reads the markdown directly (per ADR-013). This lets enterprises register domain rules (e.g. "layover policies") that the planner can answer without invoking any Tools.

## Done when
- `FeatureDescriptor` and `FeatureRegistry` types defined in `packages/runtime`.
- `InMemoryFeatureRegistry` implementation + REST endpoints (`POST /registry/features`, `GET /registry/features`, `DELETE /registry/features/:name`).
- Markdown importer parses YAML frontmatter + body from `.feature.md` files.
- `SonnetPlanner` injects registered feature content into the system prompt.
- 26+ new tests (feature registry, planner integration, REST).
- Live-verified: registered a layover-policy feature; planner answered rules correctly with no tool calls.

## Completion notes (2026-05-05)
Commit: `3428697`. 195 runtime tests green (+26 from 2.2). Live demo confirmed: layover rules answered from feature doc alone — 60-min same-airline / 90-min cross-airline minimums, baggage auto-transfer, visa hints — with zero tool calls in runtime log.
