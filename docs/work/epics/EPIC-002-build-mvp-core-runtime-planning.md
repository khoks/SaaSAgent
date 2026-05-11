# EPIC-002 — Build MVP core runtime and planning stack

- **Status:** done
- **Created:** 2026-05-07
- **Last updated:** 2026-05-07
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Phases 2.1–2.7 of the MVP runtime: Sonnet Planner wired to Claude Agent SDK, three-tier capability execution, features/adapters/memory registries, federated sub-agents, VoC capture + churn pipeline, bearer auth, and token-bucket rate limiting.

## Why
This was the "planning MVP" gate (Phase 2 in INIT-003). Completing it proved the full bidirectional loop: user input → planner → composer → rendered UI → emit → re-plan.

## Done when (met)
- End-to-end conversational turn with planner + composer works. ✓
- Features registry (`.feature.md` docs as planner context) integrated. ✓
- Memory providers: KV + PostgreSQL, per-session continuity. ✓
- Federated sub-agents via HTTP REST (`/federate` endpoint). ✓
- VoC capture (FeedbackBar widget + implicit re-ask signal). ✓
- Churn risk calculators (rule-based, weighted-feature, ML training pipeline). ✓
- Bearer auth + token-bucket rate limiting on transport. ✓
- Docker Compose with full polyglot stack. ✓
- 384 tests across 4 packages passing at commit `fb17407`. ✓

## Child stories
_(none — implemented directly from phase plan in INIT-003)_
