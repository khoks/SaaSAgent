# EPIC-010 — Phase 2 Capability execution layer

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05 (addendum: 2.4 + 2.4.x + 2.5 + 2.6 done)
- **Completed:** 2026-05-05
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
End-to-end conversational turn: user text input → planner (Sonnet) → capability dispatch (Skills / Tools / Sub-Agents) → composer → rendered UI artifact → instruction emit → planner re-plan. Demonstrates the full bidirectional loop with at least 1 Skill and 1 Tool.

## Why
Phase 2 is the MVP-of-MVP gate. Without a planner and capability execution, the harness can only render static layouts — it cannot actually orchestrate enterprise SaaS actions.

## Done when (Phase 2 gate)
- User text input reaches the planner over the existing SSE/WS transport.
- Planner selects and invokes Skills (in-process) and Tools (HTTP) via a uniform executor interface.
- Planner result drives HaikuComposer → composed UI artifact rendered in browser.
- Full round-trip verified end-to-end in Chrome.

## Child stories
- [STORY-007 — Text input bar in web-shell (Phase 2.0a)](../stories/STORY-007-text-input-bar.md) — done
- [STORY-008 — Skills and Tools registries (Phase 2.0b)](../stories/STORY-008-skills-tools-registries.md) — done
- [STORY-009 — Skill and Tool executors with REST endpoints (Phase 2.0c)](../stories/STORY-009-skill-tool-executors.md) — done
- [STORY-010 — Planner integration (Phase 2.1)](../stories/STORY-010-planner-integration.md) — done
- [STORY-011 — Features registry as planner super-skill context (Phase 2.2)](../stories/STORY-011-features-registry.md) — done
- [STORY-012 — KeyValueMemoryProvider + per-WS sessionId (Phase 2.3)](../stories/STORY-012-kv-memory-provider.md) — done
- [STORY-013 — Federated Sub-Agents (Phase 2.4)](../stories/STORY-013-federated-sub-agents.md) — done
- [STORY-014 — /federate endpoint — symmetric two-runtime federation (Phase 2.4.x)](../stories/STORY-014-federate-endpoint.md) — done
- [STORY-015 — Embedded eval scoring — per-turn quality signals (Phase 2.5)](../stories/STORY-015-embedded-eval-scoring.md) — done
- [STORY-016 — VoC + Customer Churn Risk (Phase 2.6)](../stories/STORY-016-voc-churn-risk.md) — done
