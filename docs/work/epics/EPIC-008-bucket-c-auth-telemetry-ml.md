# EPIC-008 — Bucket C auth, telemetry, ML, and E2E

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Pluggable auth providers (NoAuth / Bearer / JWT HS256+RS256), telemetry abstraction (ConsoleTelemetry + OpenTelemetry adapter), multi-tenant registry isolation, ML churn training pipeline (logistic regression with L2 + warm-start), 10 ADR markdown files, E2E test harness, and metering infrastructure. 529 tests across 9 packages.

## Why
These cross-cutting concerns harden the substrate for enterprise deployment: auth gates every endpoint, telemetry enables observability, multi-tenancy isolates registry state per tenant, and the ML training pipeline closes the feedback loop from churn signals to model weights.

## Done when (all satisfied)
- ✅ `AuthProvider` interface: `NoAuthProvider`, `BearerTokenAuthProvider`, `JwtAuthProvider` (HS256 + RS256) — 19 tests
- ✅ `Telemetry` interface: `ConsoleTelemetry`, `OpenTelemetryAdapter` (no hard OTel dep) — 13 tests
- ✅ Multi-tenant registries: tenant-scoped Skill / Tool / Feature / Sub-Agent registry wrappers + `tenantScopedSessionId` helpers — 12 tests
- ✅ `trainChurnWeights()`: pure-numeric logistic regression, L2 regularization, warm-start, deterministic seed — 8 tests
- ✅ 10 ADR markdown files added under `docs/architecture/decisions/`
- ✅ E2E test harness wired
- ✅ Metering infrastructure
- ✅ 529 tests across 9 packages, all passing

## Commit
- `c19dfcd` — build(phase-6): Bucket C
