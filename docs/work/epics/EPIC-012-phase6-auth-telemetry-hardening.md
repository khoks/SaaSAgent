---
id: EPIC-012
title: Phase 6 — Auth + telemetry + multi-tenant + ML training + eval (Bucket C)
status: in-review
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-11
---

# EPIC-012 — Phase 6: Auth + telemetry + multi-tenant + ML training + eval (Bucket C)

- **Status:** in-review
- **Created:** 2026-05-06
- **Last updated:** 2026-05-11
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
Dashboard shows auto-generated metrics for ≥1 Skill + ≥1 Sub-Agent + ≥1 Feature. ✅ closed in PR #36 (2026-05-11): `CapabilityEvalRunner` + heuristics + `/evals/capabilities` REST + self-contained dashboard polling every 3s, verified live with 6 Expedia capabilities.

## Child stories

| ID | Title | Status |
|---|---|---|
| [STORY-029](../stories/STORY-029-capability-eval-pipeline-dashboard.md) | Per-capability eval pipeline + bundled dashboard | in-review |
