---
id: EPIC-010
title: Phase 2 — Planning + three-tier capability + memory + VoC + churn
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-06
---

# EPIC-010 — Phase 2: Planning + three-tier capability + memory + VoC + churn

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

End-to-end conversational turn working: user input → planner → composer → composed UI → user interaction emit → re-plan → next artifact. Phase 2 MVP-of-MVP gate passed. Phase 2.x extended through hardening (Phase 3 + 4 work folded in).

## Key deliverables (commits in session)
| Sub-phase | Capability |
|---|---|
| 2.0a+b | Shell input bar + Skills/Tools registries — Phase 2 foundation |
| 2.0c | SkillExecutor + ToolExecutor + REST executor endpoints |
| 2.1a | Planner seam + StubPlanner + MemoryProvider stub — closes user-message routing gap |
| 2.1b | SonnetPlanner — claude-sonnet-4-6 multi-round tool_use loop |
| 2.1c | planner toolResults flow into composer — closes Phase 2.1 |
| 2.2 | Features registry — `.feature.md` docs as planner super-skill context |
| 2.3 | KeyValueMemoryProvider + per-WS sessionId — planner gets continuity |
| 2.3.x | Durable + Postgres + chained memory providers |
| 2.4 | Federated Sub-Agents — third tier of ADR-021's capability model |
| 2.4.x | /federate endpoint — symmetric federation, two-runtime demo working |
| 2.5 | Embedded eval scoring — per-turn quality signals + REST + WS intercept |
| 2.5.x | FeedbackBar widget + implicit re-ask signal — closes VoC capture loop |
| 2.6 | VoC + Customer Churn Risk — closes ADR-032 loop |
| 2.6.x | WeightedFeatureChurnCalculator — parameterized linear model behind ChurnRiskCalculator |
| 2.7 | Hardening — bearer auth + token-bucket rate limiting + docker-compose |

## Phase 2 gate
End-to-end conversational turn working (Planner + Composer + Skills + Tools). ✅

## Notes
Phase 3 (Sub-Agent federation) and Phase 4 (Memory + VoC + Churn) work was executed within Phase 2.x commits rather than as separate phases, as velocity allowed.
