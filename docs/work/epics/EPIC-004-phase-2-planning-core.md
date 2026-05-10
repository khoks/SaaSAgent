# EPIC-004 — Phase 2 Planning core

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Full end-to-end conversational turn working: SonnetPlanner (claude-sonnet-4-6) with multi-round tool_use loop, three-tier capability invocation (Skills / Tools / Sub-Agents), Features registry (.feature.md super-skill-doc), KeyValueMemoryProvider with per-WS sessionId, and federated sub-agents via /federate endpoint. Verified live in Chrome.

## Why
This is the MVP-of-MVP gate — the substrate is only real when an LLM-driven planner can receive user intent, invoke capabilities, and compose a UI response through a full reasoning loop.

## Done when (all satisfied)
- ✅ Shell InputBar: text message → WS `user-message` envelope → planner
- ✅ SkillExecutor + ToolExecutor (in-process and HTTP); REST `/executor/skill/*` + `/executor/tool/*`
- ✅ Planner seam (interface + StubPlanner + NullMemoryProvider)
- ✅ SonnetPlanner: multi-round Anthropic tool_use; `skill__` / `tool__` / `subagent__` prefix dispatch
- ✅ toolResults flow into HaikuComposer ComposeContext
- ✅ Features registry: InMemoryFeatureRegistry + REST + Markdown importer; SonnetPlanner injects feature content into system prompt
- ✅ KeyValueMemoryProvider: per-WS sessionId; /memory REST; memory recall proven (Blade Runner multi-turn test)
- ✅ Federated Sub-Agents: SubAgentRegistry + SubAgentExecutor + REST; /federate endpoint; two-runtime live demo
- ✅ Embedded eval scoring: EvalProvider + REST /eval + WS eval-feedback intercept
- ✅ VoC + Customer Churn Risk: ChurnRiskCalculator, /churn REST, closed-loop live verified (3 sessions, 3 risk levels)

## Sub-phases shipped
| Sub-phase | Commit | What |
|---|---|---|
| 2.0a+2.0b | `68a606e` | InputBar + Skills/Tools registries |
| 2.0c | `f1e3304` | SkillExecutor + ToolExecutor + REST executor endpoints |
| 2.1a | `f6591a5` | Planner seam + StubPlanner + NullMemoryProvider |
| 2.1b | `f34e79a` | SonnetPlanner multi-round tool_use loop |
| 2.1c | `eacb86b` | planner toolResults → composer |
| 2.2 | `3428697` | Features registry (.feature.md super-skill-doc) |
| 2.3 | `a8972e4` | KeyValueMemoryProvider + per-WS sessionId |
| 2.4 | `21c1fde` | Federated Sub-Agents (third tier) |
| 2.4.x | `455e57a` | /federate endpoint — symmetric two-runtime federation |
| 2.5 | `e6a4e54` | Embedded eval scoring + WS intercept |
| 2.6 | `5934a15` | VoC + Customer Churn Risk |
