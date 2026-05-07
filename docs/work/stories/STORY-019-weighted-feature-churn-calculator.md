# STORY-019 — WeightedFeatureChurnCalculator (Phase 2.6.x)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Parameterized linear churn model (replaces the naive `SimpleChurnRiskCalculator`):
- `WeightedFeatureChurnCalculator` — accepts a weight vector (feedback rate, friction rate, unresolved rate, session length) configurable at runtime-init.
- Default weights calibrated for MVP cold-start (equal weights, 0.25 each).
- `ChurnRiskCalculator` interface fulfilled; both implementations registered as named strategies.
- Tests: weight vector boundary cases, zero-vector guard, per-feature contribution verification.

## Done when
- `WeightedFeatureChurnCalculator` is the default churn strategy in the runtime.
- Weights configurable via `RuntimeConfig`.
- All existing VoC tests continue to pass.

## Result
Done. Commit `72d8ed4`. Parameterized linear churn model behind `ChurnRiskCalculator` interface.
