# P-005: Closed-loop explainable churn-risk derivation with per-feature contribution factors

| Field | Value |
|---|---|
| Disclosure id | P-005 |
| Inventor | Rahul Khokhar |
| Date of conception | 2026-04-25 (ADR-008 commit) |
| Date of reduction to practice | 2026-05-05 (Phase 2.6.x — `weighted-feature.ts` + Phase 6 `training.ts`) |
| Conception evidence | `docs/architecture/adr/008-eval-and-churn-loop.md` |
| Reduction-to-practice evidence | `packages/runtime/src/churn/rule-based.ts`; `packages/runtime/src/churn/weighted-feature.ts`; `packages/runtime/src/churn/training.ts`; `packages/runtime/src/eval/keyvalue.ts` |
| Status | draft |
| Assignee | TBD (Rahul Khokhar pending entity formation) |

## 1. Field of the invention

The invention relates to AI-agent retention analytics, and specifically to
a closed-loop pipeline that derives a per-session churn-risk score from
per-turn quality signals, the score being computed by a parameterized
linear model that simultaneously produces (a) a numeric risk value and (b)
a human-readable per-feature contribution list naming which features fired
with what magnitude.

## 2. Background — problem

Churn risk modeling is mature in subscription and SaaS analytics: a
production model takes a customer's behavior history and returns a
0-to-1 probability that they'll cancel in the next N days. Standard
techniques: gradient-boosted trees (XGBoost, LightGBM), deep tabular
networks (TabNet), survival models (Cox PH).

These models have two well-known production problems:

1. **Black-box scores**: a tree ensemble produces a score; SHAP / LIME /
   Integrated Gradients are bolted on POST-HOC to attribute the score to
   features. Post-hoc attribution is computationally expensive and not
   always accurate.
2. **Latency at serve time**: serving a 500-tree ensemble plus running
   SHAP for each prediction is too slow for online use cases where the
   score has to be computed inside the agent's response loop.

A second-class problem specific to AI-agent retention:

3. **Sparse feedback**: most users don't leave explicit feedback. The
   model has to extract signal from whatever implicit and explicit
   per-turn signals are available, and each session may have only a
   handful of signals. Tree ensembles trained on tabular customer
   features struggle when the input is a small sequence of categorical
   signals.

### State of the art

- XGBoost / LightGBM (2014-2017): standard gradient-boosted-tree churn
  models. High accuracy on tabular data; black-box at inference.
- SHAP (Lundberg + Lee, 2017): post-hoc additive feature attribution.
  Adds 10-100x inference latency.
- TabNet (Arik + Pfister, 2019): deep tabular model with built-in
  attention-style attribution. Closer to white-box but the attribution
  isn't human-readable text.
- Logistic regression (since the 1950s): linear model with built-in
  per-feature coefficients. Lower accuracy on complex features but
  inherently interpretable.
- Survival analysis (Cox PH, 1972): models hazard rates; not natively
  suited to per-turn signal aggregation.

The novel contribution is the SPECIFIC pipeline shape:
agent-quality-signal capture → per-session feature extraction → linear
model with hand-tuned and trainable weights → simultaneous numeric +
human-readable attribution output.

## 3. Summary of the invention

A method whereby an AI-agent runtime captures per-turn quality signals
into a structured event store, extracts a fixed-vocabulary feature vector
per session (e.g., negativeRatio, noCompletion, recentNegative,
avgScoreInverted, logSessionLength), runs the feature vector through a
parameterized linear model `score = sigmoid(bias + Σ wi * fi)`, and emits
a churn-risk record comprising:

- A numeric `score` in [0, 1].
- A discrete `riskLevel` ∈ {low, medium, high} bucketed from the score.
- A human-readable `factors` list naming each feature that contributed
  meaningfully to the score, with magnitude.

The same model architecture is used for both:

- **Rule-based v0** (deployed without training data): hand-tuned weights
  produce a rule-like behavior with explainable factors.
- **Trained v1** (when labeled sessions exist): weights fit by logistic
  regression on labeled (features, churned) pairs via gradient descent.

The model's interpretability is **architectural, not post-hoc**: the
linear-combination structure means each feature's contribution to the
final score is exactly `wi * fi`, no approximation needed.

## 4. Detailed description

### 4.1 Architecture overview

```
   Per-turn signals (P-004 implicit + explicit thumbs)
            │
            │ EvalProvider.record(signal) ── ADR-008
            ▼
   ┌────────────────────────────┐
   │  EvalProvider              │ (KeyValueEvalProvider, ClickHouseEvalProvider)
   │  store of EvalSignals      │   indexed by (session, time)
   │  signal: positive | negative│
   │  | neutral | completion    │
   │  source: user-explicit |   │
   │  user-implicit | system    │
   └──────────┬─────────────────┘
              │
              │ ChurnRiskCalculator.computeForSession(s)
              │   reads N most-recent signals
              ▼
   ┌────────────────────────────────────────────────┐
   │  Feature extraction                            │
   │                                                │
   │  feature negativeRatio = (#negative + 0.5×#neutral) / total│
   │  feature noCompletion  = 1 if #completion=0 && total>=2    │
   │  feature recentNegative = #(last 3 are negative) / 3        │
   │  feature avgScoreInverted = 1 - avg(scores) when present    │
   │  feature logSessionLength = log10(total + 1) / 2            │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────┐
   │  Linear model + sigmoid                │
   │                                        │
   │  z = bias + Σ wi * fi                  │
   │  score = sigmoid(z)  ∈ (0, 1)         │
   └──────────┬─────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────┐
   │  Output assembly                       │
   │                                        │
   │  score:    0.74                        │
   │  riskLevel: 'high' (>0.6)              │
   │  factors:                              │
   │    "no completion across the session" (+0.5)│
   │    "negativeRatio=0.6 (3/5)"          (+1.2)│
   │    "recent 2 of 3 signals were negative" (+0.4)│
   │  model: 'rule-based-v0' or 'weighted-feature-v1' or 'trained-2026-05-06'│
   └────────────────────────────────────────┘
```

### 4.2 Mechanisms

#### 4.2.1 Quality-signal store

EvalSignals follow this schema:

```
{
  composeCycleId: string,        // P-001 cycle id (per-artifact attribution)
  sessionId: string,
  signal: 'positive' | 'negative' | 'neutral' | 'completion',
  source: 'user-explicit' | 'user-implicit' | 'system',
  score?: number,                // optional fine-grained value [0..1]
  comment?: string,
  intent?: string,
  at: ISO-8601 timestamp
}
```

Signals come from:
- User-clicked feedback widgets (`source: 'user-explicit'`).
- Automatic re-ask inference (P-004; `source: 'user-implicit'`).
- System-detected outcomes (planner failure, tool error;
  `source: 'system'`).

The EvalProvider abstracts the storage backend; KeyValueEvalProvider for
dev, ClickHouseEvalProvider for production, both behind the same
`record(signal)` + `query(filter)` interface.

#### 4.2.2 Feature extraction

For a given sessionId, the calculator reads up to N=1000 recent
EvalSignals and extracts a fixed-vocabulary FeatureVector:

| Feature | Computation | Range |
|---|---|---|
| `negativeRatio` | (count(negative) + 0.5 × count(neutral)) / total | [0, 1] |
| `noCompletion` | 1 if count(completion) = 0 AND total ≥ 2; else 0 | {0, 1} |
| `recentNegative` | count(negative) in last min(3, total) / min(3, total) | [0, 1] |
| `avgScoreInverted` | 1 - mean(score) over signals with `score` set; 0 otherwise | [0, 1] |
| `logSessionLength` | log10(total + 1) / 2  (≈0.5 at total=100) | [0, ~1] |

The vocabulary is small (5 features) and stable across model versions.
This is the key to interpretability: the same feature names appear in
every churn record, so a human reading "factors" knows what each one
means.

#### 4.2.3 Linear model

The linear-combination + sigmoid is the simplest model architecture that
admits both:

- **Hand-tuning**: a developer with no labeled data sets `bias` and the
  feature weights to encode "rules" the team agrees on. The
  reduced-to-practice DEFAULT_WEIGHTS produce rule-based-v0 behavior.

- **Training**: when (features, churned) pairs become available, a
  standard logistic-regression fit via gradient descent (with L2
  regularization) produces weights for trained-vN.

```
DEFAULT_WEIGHTS = {
  bias: -2.5,           // empty session ≈ sigmoid(-2.5) ≈ 0.076 (low)
  negativeRatio: 4.0,   // all-negative session ≈ +4 logit → sigmoid ≈ 0.82 (high)
  noCompletion: 1.0,    // multi-turn no-completion bumps score
  recentNegative: 1.5,  // recent-trend amplifier
  avgScoreInverted: 1.0,
  logSessionLength: 0.3 // signal-volume confidence
}
```

#### 4.2.4 Per-feature contribution attribution

The linear model's structure means each feature's contribution to the
final z is exactly `wi * fi`. The output assembly converts each non-zero
contribution into a human-readable factor string:

```
factors = []
if (counts.negative > 0) {
  factors.push(`${counts.negative}/${total} signals were negative (ratio ${negativeRatio.toFixed(2)})`)
}
if (counts.completion === 0 && total >= 2) {
  factors.push('no completion signals across the session')
} else if (counts.completion > 0) {
  factors.push(`${counts.completion} task completion signal(s)`)
}
if (recentNeg >= 2 && tail.length >= 2) {
  factors.push(`recent ${recentNeg}-of-${tail.length} signals were negative (trending down)`)
}
```

Each factor is a sentence the host can surface verbatim in admin
dashboards, win-back workflows, or alert messages.

#### 4.2.5 Bucketing the score

```
if (score >= 0.6)      riskLevel = 'high'
else if (score >= 0.3) riskLevel = 'medium'
else                   riskLevel = 'low'
```

The thresholds are configurable; the values shown are the defaults.

#### 4.2.6 Model attribution for cohort analysis

Every ChurnRiskScore carries a `model` field naming the calculator that
produced it:

- `'rule-based-v0'` for the hand-tuned weights.
- `'weighted-feature-v1'` for the parameterized model with default weights.
- `'trained-YYYY-MM-DD'` for a model trained with labeled data on a given
  date.

Hosts running A/B tests can group risk scores by model and analyze
prediction quality by cohort.

#### 4.2.7 Training pipeline

When labeled (features, churned) pairs become available, `trainChurnWeights`
runs gradient descent on the logistic loss:

```
Loss(w) = -mean[y · log(σ(w·x)) + (1-y) · log(1-σ(w·x))] + λ/2 · ||w||²

Update: w := w - η · (σ(w·x) - y) · x   (per example, batch-shuffled)
```

Defaults: 200 epochs, lr=0.1, l2=1e-3. Returns `TrainResult` with `weights`,
`finalLoss`, `history` (loss per epoch for convergence plots), `samples`,
`trainAccuracy`. Deterministic via Mulberry32 seed.

The trained weights drop directly into a new
`WeightedFeatureChurnCalculator(evalProvider, weights)` instance — same
model architecture, same feature extraction, same factor-list output.

### 4.3 Embodiments

#### 4.3.1 Reduced-to-practice embodiment (this codebase)

Three-feature → 5-feature evolution. `RuleBasedChurnCalculator` ships
with hand-tuned threshold rules; `WeightedFeatureChurnCalculator` ships
with the linear model + DEFAULT_WEIGHTS; `trainChurnWeights` ships the
training entry point.

#### 4.3.2 Alternative embodiment — additional features

Vocabulary extension: add `daysSinceLastSession`, `topicDiversity`,
`failedToolCallRatio` etc. The linear model accommodates new features by
adding new weight entries. Existing factors continue to work; new factors
appear in `factors[]` when their contribution is non-zero.

#### 4.3.3 Alternative embodiment — non-linear with explainability preserved

A monotonic gradient-boosted tree (LightGBM with monotonic constraints)
can replace the linear model and still admit per-feature attribution via
SHAP. The pipeline shape is the same; only the inference layer changes.
The reduced-to-practice embodiment stays linear because:

- The feature vocabulary is small (5).
- The dataset will be small for some time (10s-1000s of labeled sessions).
- Linear models train + serve fast and don't require a GPU.

#### 4.3.4 Alternative embodiment — multi-tier ensemble

A two-tier model: rule-based for cold-start sessions (< 3 signals);
weighted-feature for sessions with sufficient signal volume. The
calculator dispatches based on signal count.

### 4.4 Code references (reduction to practice)

```
packages/runtime/src/churn/types.ts                           — ChurnRiskCalculator interface
packages/runtime/src/churn/rule-based.ts                      — rule-based-v0
packages/runtime/src/churn/weighted-feature.ts                — linear model + DEFAULT_WEIGHTS + factor extraction
packages/runtime/src/churn/training.ts                        — gradient-descent logistic regression
packages/runtime/src/churn/training.test.ts                   — convergence, sign-recovery, determinism, warm-start tests
packages/runtime/src/eval/keyvalue.ts                         — quality-signal store (KeyValueEvalProvider)
packages/runtime/src/eval/clickhouse.ts                       — durable analytics path
packages/runtime/src/transport/server.ts:/churn/sessions/<id>  — REST endpoint exposing ChurnRiskScore
packages/protocol/src/churn.ts                                — wire types ChurnRiskScore + ChurnRiskLevel
docs/architecture/adr/008-eval-and-churn-loop.md              — design rationale
```

## 5. Drawings

### Figure 1 — End-to-end pipeline

(See ASCII in §4.1.)

### Figure 2 — Sample ChurnRiskScore output

```
{
  "sessionId": "sess-mad",
  "score": 1.000,
  "riskLevel": "high",
  "signalsAnalyzed": 3,
  "factors": [
    "3/3 signals were negative (ratio 1.00)",
    "no completion signals across the session",
    "recent 3-of-3 signals were negative (trending down)"
  ],
  "computedAt": "2026-05-05T22:38:00Z",
  "model": "rule-based-v0"
}
```

## 6. Claims (drafted broadly — for attorney review)

### Claim 1 (independent method claim)

A computer-implemented method for deriving an explainable churn-risk score
from AI-agent quality signals, the method comprising:

(a) at a runtime, capturing a stream of quality-signal records, each
record comprising at least a session identifier, a signal kind selected
from a predefined kind vocabulary, a signal source indicator selected
from a predefined source vocabulary, and a timestamp;

(b) for a queried session, retrieving a subset of the captured quality-
signal records associated with the session;

(c) extracting from the retrieved records a feature vector comprising a
fixed plurality of named numeric features, each feature being a function
of the count and ordering of signals of specific kinds within the
retrieved records;

(d) computing a continuous risk value as the sigmoid of a parameterized
linear combination of the feature vector and a parameter vector
comprising a bias term and a per-feature weight;

(e) categorizing the risk value into a discrete risk level by comparing
the risk value to one or more threshold values; and

(f) producing a churn-risk record comprising:
  - the continuous risk value;
  - the discrete risk level; and
  - an ordered list of human-readable factor strings, each factor string
    naming one of the named numeric features that contributed
    non-trivially to the risk value, the factor string being constructed
    from the count and ratio of underlying signals such that the factor
    is interpretable to a non-expert reader.

### Claim 2 (dependent — multi-source signal capture)

The method of claim 1, wherein the source vocabulary in step (a) comprises
at least three distinct sources:
  - a first source corresponding to user-provided explicit feedback;
  - a second source corresponding to implicit feedback inferred from user
    behavior; and
  - a third source corresponding to system-inferred signals from runtime
    operations.

### Claim 3 (dependent — implicit signal source from re-ask)

The method of claim 2, wherein quality-signal records originating from the
second source are produced according to the method of [P-004, claim 1].

### Claim 4 (dependent — per-feature contribution rendering)

The method of claim 1, wherein each factor string in the ordered list of
step (f) is constructed from a template that incorporates one or more of:
the count of relevant signals, the ratio of relevant signals to total
signals, and the temporal pattern of relevant signals.

### Claim 5 (dependent — model attribution + cohorting)

The method of claim 1, wherein the churn-risk record of step (f) further
comprises a model identifier naming the parameter vector used in step (d),
such that risk records produced by different parameter vectors can be
distinguished and analyzed in aggregate.

### Claim 6 (dependent — training pipeline)

The method of claim 1, further comprising:

(g) given a set of labeled samples each comprising a feature vector and a
binary churn label, fitting an updated parameter vector by minimizing a
logistic-regression loss with regularization via gradient descent; and

(h) deploying the updated parameter vector for use in subsequent
invocations of step (d), without changing the feature extraction of step
(c) or the factor rendering of step (f).

### Claim 7 (independent system claim)

A churn-risk derivation system comprising:

a quality-signal store storing per-session signal records;

a feature-extraction component configured to compute a fixed-vocabulary
feature vector from a session's signal records;

a linear-model component configured to compute a continuous risk value
as the sigmoid of a parameterized linear combination of the feature
vector and a parameter vector;

a bucketing component configured to classify the risk value into a
discrete risk level; and

a factor-attribution component configured to produce, alongside the risk
value, an ordered list of human-readable factor strings naming the
features that contributed to the risk value, the factor strings being
templated from the underlying signal counts and ratios.

### Claim 8 (independent computer-readable medium claim)

A non-transitory computer-readable medium storing instructions that, when
executed by one or more processors, cause the one or more processors to
perform the method of claim 1.

## 7. Prior art — known references

| Reference | What it teaches | What it doesn't teach |
|---|---|---|
| XGBoost / LightGBM (2014-2017) | Gradient-boosted trees for tabular churn prediction. | Black-box; no architectural attribution; no human-readable factor list. |
| SHAP (Lundberg + Lee, 2017) | Post-hoc feature attribution via Shapley values. | 10-100x latency overhead; not architectural; doesn't produce templated human-readable text. |
| TabNet (Arik + Pfister, 2019) | Attention-based tabular model with built-in attribution. | Attribution is per-feature numeric importance; not human-readable text. |
| Logistic regression (1950s+) | Linear model with per-feature coefficients. | Doesn't address: feature extraction from agent quality signals; templated factor rendering; closed-loop integration with implicit signal capture. |
| Cox proportional-hazards (1972) | Survival analysis. | Hazard rate, not per-session risk score; not natively interpretable in the same way. |
| US 11,403,569 (customer churn ML) | Various ML approaches to churn prediction. | Doesn't teach the specific agent-quality-signal pipeline + architectural interpretability + templated factors. |
| US 11,205,068 (interpretable ML for risk) | Generic interpretable ML for risk scoring. | Not specific to AI-agent quality signals; doesn't bind to the per-turn / per-cycle attribution. |

## 8. Apache 2.0 implications

Same as P-001.

## 9. Open questions for counsel

1. **Combined application with P-004**: P-004 produces some of the input
   signals to P-005's pipeline. Counsel should advise whether to file a
   single application with P-004 + P-005 combination claims, or two
   separate filings.
2. **Templated factor strings as patentable subject matter**: the factor
   templates are arguably "presenting information," which has historical
   patent eligibility issues. The argument for eligibility: the templates
   are mechanically derived from the model's structure, not arbitrary
   labels.
3. **Post-Alice §101 risk**: any claim involving a "model that produces a
   score plus an explanation" risks rejection under §101 (abstract idea).
   Counsel should draft claim 1 to emphasize the technical pipeline +
   specific feature vocabulary + specific data structures, not the
   abstract concept of "explainable churn."
4. **Foreign filings**: churn modeling is more commercially valuable in
   the US than EU. Consider US-only unless an EU buyer materializes.
