# STORY-001 — Decide Feature/Service NL→JSON compilation timing

- **Status:** done
- **Created:** 2026-04-28
- **Last updated:** 2026-05-07
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need to know when `.feature.md` natural-language descriptions are compiled to typed JSON so that the runtime pipeline latency and author iteration loop are correctly designed.

## Context
ADR-011 settled the `.feature.md` format (MD + YAML frontmatter + inline JSON). The open sub-question is *when* the NL gets compiled:
- **Registration-time** — pre-compiled, cached; fast at runtime; slower author iteration; predictable.
- **Runtime** — always re-interpreted; more flexible; model spend per turn; less predictable.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.1 marked resolved.

## Resolution note
Resolved by implementation: features registry uses  docs as runtime planner context (no pre-compilation). ADR committed in Phase 2.2 (commit ).
