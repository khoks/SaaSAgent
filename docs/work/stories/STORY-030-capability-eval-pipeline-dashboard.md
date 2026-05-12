---
id: STORY-030
title: Capability eval pipeline + self-contained HTML dashboard
status: done
epic: EPIC-012
created: 2026-05-12
last-updated: 2026-05-12
---

# STORY-030 — Capability eval pipeline + self-contained HTML dashboard

- **Status:** done
- **Completed:** 2026-05-12
- **Created:** 2026-05-12
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-012 — Phase 6: Auth + telemetry + eval (Bucket C)](../epics/EPIC-012-phase6-auth-telemetry-hardening.md)
- **PR:** khoks/SaaSAgent#36 (merged 2026-05-12)
- **ADR:** ADR-037

## User story
As a SaaS operator, I want to see auto-generated quality metrics for every registered capability (skills, tools, sub-agents) in a dashboard so that I can identify degraded capabilities without writing any eval code.

## What was built

| Layer | Deliverable |
|---|---|
| `packages/runtime/src/capeval/` | `CapabilityEvalRunner` interface + `InMemoryCapabilityEvalRunner` with ring buffer (last 100 invocations per capability) |
| 3 heuristics | `outcomeSuccess` (non-error result), `outputNonEmpty` (non-null/empty output), `latencyBudget` (< 2 s) |
| `onInvocation` hooks | Wired into all three executors (skill, tool, subagent) via a non-invasive callback pattern |
| REST endpoints | `GET /evals/capabilities` (worst-first list), `GET /evals/capabilities/<name>` (detail with p50/p95 latency) |
| `GET /dashboard` | Self-contained HTML + vanilla JS, polls every 3 s, worst-first card grid, per-heuristic bar breakdowns |
| `/health` | Exposes `capabilityEvalRunner` + `capabilityEvalCount` |

## Tests
- 16 unit tests for `InMemoryCapabilityEvalRunner` (ring buffer, heuristics, worst-first ordering)
- 5 server-integration tests (hook fires on skill/tool/subagent execution, REST endpoints return correct data)
- Total after: 472/472 green

## Live verification (Expedia demo)
6 capabilities tracked simultaneously (5 skills + 1 sub-agent + 1 tool). Worst-first ordering surfaced real failures: `trip-planner` (sub-agent unreachable, 33.3%) and `expedia-fetch-flight` (tool backend offline, 33.3%) rendered as red cards at top. Healthy skills (`expedia.search-flights`, etc.) rendered green 100%.

## Phase 6 gate satisfied
Dashboard shows auto-generated metrics for ≥1 Skill + ≥1 Sub-Agent + ≥1 Feature. ✅

## Acceptance criteria
- [x] All three executors fire `onInvocation` hook
- [x] Ring buffer stores last 100 results per capability
- [x] Worst-first ordering puts degraded capabilities at top
- [x] Dashboard auto-polls every 3 s and renders live
- [x] 472/472 tests pass
