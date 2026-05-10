# EPIC-005 — Phase 2 deferred items + hardening

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
All deferred Phase 2 items shipped: durable + Postgres + chained memory providers, FeedbackBar widget with explicit and implicit eval signals, WeightedFeatureChurnCalculator (parameterized linear model), and bearer token auth + token-bucket rate limiting + docker-compose.yml hardening.

## Why
These items were deferred from their original sub-phase to be completed in a single pass after the core planning loop was proven. They complete the Phase 2 substrate.

## Done when (all satisfied)
- ✅ DurableFileMemoryProvider (atomic JSON-on-disk)
- ✅ PostgresMemoryProvider (injectable client interface; no hard `pg` dep)
- ✅ ChainedMemoryProvider (multi-provider cascade)
- ✅ FeedbackBar widget (thumbs up/down → `eval-feedback` WS envelope)
- ✅ Implicit re-ask signal: second message within 8s window → `negative/user-implicit` eval signal attributed to prior cycle (P-004 verified live)
- ✅ WeightedFeatureChurnCalculator: parameterized linear model with sigmoid; configurable weights; stepping stone to LightGBM
- ✅ Bearer token auth on HTTP + WS endpoints (query-param fallback)
- ✅ Token-bucket rate limiter (configurable window + max-requests)
- ✅ `docker-compose.yml` with full polyglot stack + runtime service
- ✅ 384 tests across 6 packages

## Sub-phases shipped
| Sub-phase | Commit | What |
|---|---|---|
| 2.3.x | `5b0c2e7` | DurableFile + Postgres + Chained memory providers |
| 2.5.x | `c2b2bfd` | FeedbackBar widget + implicit re-ask signal |
| 2.6.x | `72d8ed4` | WeightedFeatureChurnCalculator |
| 2.7 | `fb17407` | Bearer auth + rate limiting + docker-compose |
