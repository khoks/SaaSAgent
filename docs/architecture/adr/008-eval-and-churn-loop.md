# ADR-008: Closed-loop eval signals + churn risk derivation

**Status:** accepted
**Decision date:** 2026-04-25

## Context

An agent that doesn't measure outcomes can't improve. We need a feedback
loop that:

1. Captures per-turn quality signals from users (explicit thumbs up/down)
   and from behavior (re-ask within N seconds → implicit negative).
2. Aggregates those signals into per-session risk scores so retention and
   product teams can act on them.
3. Eventually trains a real ML model on the accumulated labels.

Three things had to be settled:

- **Where do signals enter?** REST + WS envelope are both required —
  feedback widgets and analytics SDKs both need a path.
- **What's the v0 risk model?** No labeled data exists at MVP, so we can't
  fit a real model. But we want the architecture in place.
- **How do explainability concerns get satisfied?** Risk scores affect
  customer-facing outreach — opaque numbers aren't acceptable.

## Decision

**Two layers, separate concerns:**

1. **EvalProvider** captures `EvalSignal { composeCycleId, sessionId,
   signal, source, score?, comment?, intent?, at }`. Signals come from:
   - REST `POST /eval` (explicit user thumbs from a widget, or out-of-band
     analytics).
   - WS envelope `type='eval-feedback'` (in-shell feedback widget).
   - Implicit re-ask inference (user-message within N seconds of a
     broadcast → `{ signal: 'negative', source: 'user-implicit' }`).
   - System inference (planner failure / tool error → `source: 'system'`).

2. **ChurnRiskCalculator** derives `ChurnRiskScore { score, riskLevel,
   factors[], model }` per session by reading the EvalProvider. Two
   implementations ship today:
   - `RuleBasedChurnCalculator` — explainable hand-tuned rules (negative
     ratio + no-completion + recent-trending-negative).
   - `WeightedFeatureChurnCalculator` — same architecture as a logistic
     regression with hand-tuned weights. Matches the linear model a real
     fit would produce; warm-startable with `trainChurnWeights()`.

**Every score includes a `factors[]` list naming which features fired.**
Explainability is non-negotiable.

## Consequences

**Pro:**
- Signal capture works on day 1 even before any ML model exists.
- Migration to real ML is a constructor swap (`RuleBased` →
  `WeightedFeature` with trained weights) — no caller changes.
- Per-feature contributions in `factors[]` mean retention teams understand
  why each session is flagged.

**Con:**
- Without labeled training data, the v0 weighted-feature model is
  effectively rule-based. We accept that — collecting labels takes time.
- Implicit re-ask inference will misfire occasionally (legitimate quick
  follow-up vs frustrated re-ask). We treat implicit signals as weaker than
  explicit ones in the model.

## Implementation

- `packages/runtime/src/eval/`  — KeyValueEvalProvider, ClickHouseEvalProvider.
- `packages/runtime/src/churn/` — RuleBased, WeightedFeature, training.
