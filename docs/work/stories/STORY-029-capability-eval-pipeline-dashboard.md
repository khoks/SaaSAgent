# STORY-029 — Per-capability eval pipeline + bundled dashboard

- **Status:** in-review
- **Epic:** [EPIC-012 — Phase 6: Auth + telemetry + multi-tenant + ML training + eval](../epics/EPIC-012-phase6-auth-telemetry-hardening.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **PR:** khoks/SaaSAgent#36

## User story
As a SaaS enterprise developer embedding SaaSAgent, I can visit `/dashboard` and immediately see a live worst-first ranked table of all registered capabilities with overall score, success rate, and p50/p95 latency — no build step required.

## What was built (PR #36, commit `9cac636`)

| Layer | What |
|---|---|
| **Runner** | `CapabilityEvalRunner` interface + `InMemoryCapabilityEvalRunner` with per-capability ring buffer (default 200 records). Aggregates success rate, median + p95 latency, per-heuristic mean scores. `reportAll()` returns worst-first ordering. |
| **Heuristics** | Three pure-function checks: `outcome-success`, `output-non-empty`, `latency-budget` (linear degradation past target → 0 at 4× target). No I/O, no dependencies. |
| **Executor hooks** | Optional `onInvocation(record)` callback on `SkillExecutor`, `ToolExecutor`, `SubAgentExecutor`. Fires after every `execute()` regardless of success/failure. Hook errors swallowed so a bad recorder can't break the hot path. |
| **Runtime wiring** | `Runtime.capabilityEvalRunner` is a public readonly field initialized before all three executors so each binds `runner.recordInvocation` at construction time. Same instance shared with `RuntimeServer` for `/health` + `/evals/capabilities`. |
| **REST endpoints** | `GET /evals/capabilities` (worst-first list), `GET /evals/capabilities/<name>` (single, 404 if unseen). `/health` adds `capabilityEvalRunner` + `capabilityEvalCount`. |
| **Dashboard** | `GET /dashboard` — self-contained HTML, vanilla JS, no build step. Polls `/evals/capabilities` every 3s. Per-capability cards with overall score (red < 60% / amber 60–85% / green ≥ 85%), success rate, p50/p95 latency, per-heuristic bars. |

## Verified live
6 Expedia capabilities tracked (5 skills + 1 sub-agent + 1 tool). Worst-first ordering, real failure modes (offline sub-agent + offline tool backend) surfaced in red. Dashboard auto-refreshes every 3s.

## Acceptance criteria
- [x] `GET /evals/capabilities` returns worst-first list with score, rates, latencies
- [x] `GET /dashboard` renders auto-refreshing capability health cards with no build step
- [x] Executor hooks fire after every invocation without affecting the hot path
- [x] Phase 6 INIT-003 gate closed: dashboard shows metrics for ≥1 Skill + ≥1 Sub-Agent + ≥1 Feature
