# EPIC-004 — Platform hardening: auth, telemetry, multi-tenant, ML, E2E (Bucket C)

- **Status:** done
- **Created:** 2026-05-07
- **Last updated:** 2026-05-07
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Pluggable AuthProvider (NoAuth / Bearer / JWT HS256+RS256), Telemetry abstraction (ConsoleTelemetry + OpenTelemetryAdapter), multi-tenant isolation, ML churn training pipeline (Python LightGBM), ADR doc series (ADR-028 to ADR-034), E2E integration tests, and usage metering.

## Why
Covers INIT-003 Phase 6 (Eval/hardening) capabilities: auth abstraction, observability, tenancy isolation, and ML model training pipeline, bringing the runtime to production-class robustness.

## Done when (met)
- `AuthProvider` interface + 3 implementations (19 tests). ✓
- `Telemetry` interface + ConsoleTelemetry + OpenTelemetryAdapter (13 tests). ✓
- Multi-tenant isolation: `TenantContext` + `TenantRegistry` (44 tests). ✓
- ML churn training pipeline: `ChurnModelTrainer` + feature engineering (34 tests). ✓
- ADR-028 through ADR-034 committed to decision-log. ✓
- E2E integration tests wired. ✓
- Usage metering implemented. ✓
- 529 tests across 9 packages passing at commit `c19dfcd`. ✓

## Child stories
_(none — implemented directly from phase plan in INIT-003)_
