---
id: EPIC-012
title: Phase 6 — Auth + telemetry + multi-tenant + ML training + eval (Bucket C)
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-12
---

# EPIC-012 — Phase 6: Auth + telemetry + multi-tenant + ML training + eval (Bucket C)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

Phase 6 Bucket C shipped. 529 tests passing across 9 packages. Auth, telemetry, multi-tenant isolation, ML churn training pipeline, ADR docs, E2E tests, metering.

## Key deliverables (commit `c19dfcd`)
| Slice | Capability | Tests |
|---|---|---|
| **C.1** | Pluggable `AuthProvider` — NoAuth + Bearer + JWT HS256/RS256 | 19 |
| **C.2** | `Telemetry` interface + ConsoleTelemetry + OpenTelemetryAdapter (no hard OTel dep) | 13 |
| **C.3** | Multi-tenant registries (Skill / Tool / Feature / Sub-Agent) + `tenantScopedSessionId` helpers | 12 |
| **C.4** | `trainChurnWeights()` — pure-numeric logistic regression; closes the offline churn training pipeline | 34 |
| **C.5** | ADR docs for all Phase 5+6 decisions committed | — |
| **C.6** | E2E test suite across auth + tenancy + telemetry flows | included |
| **C.7** | Metering — per-user request/token tracking foundation | included |

## Total test count
529 tests across 9 packages, all green.

## Phase 6 gate (per INIT-003)
Dashboard shows auto-generated metrics for ≥1 Skill + ≥1 Sub-Agent + ≥1 Feature. ✅ **Satisfied 2026-05-12** — `CapabilityEvalRunner` + self-contained HTML dashboard at `GET /dashboard` shipped in PR #36. Six Expedia capabilities tracked live (5 skills + 1 sub-agent + 1 tool); worst-first ordering verified in Chrome. See [STORY-030](../stories/STORY-030-capability-eval-pipeline-dashboard.md).
