# P-004: Implicit negative-signal inference via timing window on follow-up natural-language input

| Field | Value |
|---|---|
| Disclosure id | P-004 |
| Inventor | Rahul Khokhar |
| Date of conception | 2026-05-04 (Phase 2.5.x design — implicit re-ask signal) |
| Date of reduction to practice | 2026-05-05 (commit on `main` adding implicit re-ask intercept) |
| Conception evidence | `docs/architecture/adr/008-eval-and-churn-loop.md`; `phase-1.4-review.md` discussion |
| Reduction-to-practice evidence | `packages/runtime/src/transport/server.ts` (handleWsConnection — implicitReaskWindowMs); `packages/runtime/src/eval/keyvalue.ts`; `packages/runtime/src/transport/server.test.ts` (re-ask tests) |
| Status | draft |
| Assignee | TBD (Rahul Khokhar pending entity formation) |

## 1. Field of the invention

The invention relates to AI agent quality measurement and churn risk
modeling, and specifically to a mechanism for automatically inferring
negative quality signals on previously-emitted UI artifacts when the user
provides a fresh natural-language input within a defined timing window
after the artifact's emission, without requiring any explicit feedback
from the user.

## 2. Background — problem

Training feedback for AI systems comes in two forms:

1. **Explicit signals**: user clicks "thumbs up" or "thumbs down", rates
   on a 1-5 scale, leaves a comment.
2. **Implicit signals**: derived from observed behavior — dwell time,
   click-through rate, abandonment, completion event.

Explicit signals are high quality but rare (most users don't rate). Implicit
signals are abundant but noisy. For AI agent UIs specifically, the signal-
gathering problem has additional structure that prior art doesn't address:

- The user expressed a need (turn 1).
- The agent emitted a response (turn 1's UI artifact).
- The user IS or IS NOT satisfied with that response.
- If satisfied, the next user action is typically domain-specific (clicking
  through, completing a task) — heterogeneous, hard to detect generically.
- If NOT satisfied, the next user action is **often a fresh natural-language
  input that re-states or refines the original need**.

That last observation is the lever. A fresh user message, soon after the
agent emitted a layout, is strong evidence the user wasn't satisfied with
that layout. Yet none of the prior art uses this signal.

### State of the art

- Click-through rate / dwell time as implicit signals (web search
  literature, 2000s+).
- Conversation abandonment (chatbot literature, 2010s+) — measures whether
  the user disengaged, not whether they re-asked.
- Re-query analysis (search engine literature, 2000s+): identifies
  reformulation patterns at the QUERY level (similar lexical content,
  short interval). Not applied to AI-agent UI artifacts; not used to
  attribute negative signals to specific UI artifacts.
- Microsoft Bing Chat / similar conversational search: collect explicit
  feedback widgets per turn; do not (publicly) infer implicit re-ask
  signals.
- ChatGPT / Claude.ai / Gemini consumer products: collect explicit thumbs
  feedback; the conversation is text-only so "re-ask" is essentially every
  message.

The novel contribution is the **timing-windowed inference + per-artifact
attribution** in the context of typed-JSON UI artifacts (not text-only
conversations).

## 3. Summary of the invention

A method whereby a server-side AI runtime, immediately after broadcasting
a UI artifact to a client, starts a per-connection timer. If, within a
configurable timing window (a "re-ask window," default 8 seconds in the
reduced-to-practice embodiment), the runtime receives a fresh user-message
envelope from the same client connection, the runtime automatically
records a structured negative quality signal **attributed to the
previously-broadcast UI artifact** (identified by its compose-cycle
identifier — see P-001). The negative signal is tagged with `source:
'user-implicit'` so downstream eval pipelines can distinguish it from
explicit thumbs-down feedback and weight it accordingly.

The mechanism does not require user-explicit feedback; it does not require
the user to do anything special; it produces signal at the natural rate of
user dissatisfaction.

The same mechanism is the input to a per-session churn-risk score (see
P-005) and to longer-horizon retention models.

## 4. Detailed description

### 4.1 Architecture overview

```
                         ┌───────────────────────┐
                         │  RuntimeServer        │
                         │  per-WS state:        │
                         │    lastBroadcastCycleId│
                         │    lastBroadcastAt   │
                         │    implicitWindowMs   │
                         └──────────┬────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────┐
        │                                                   │
        │ broadcastLayout(layout)                           │
        │   ─→ lastBroadcastCycleId = layout.composeCycleId │
        │   ─→ lastBroadcastAt = Date.now()                 │
        │                                                   │
        │ on WS message envelope:                           │
        │   if envelope.type == 'user-message':             │
        │     if (now - lastBroadcastAt) < implicitWindowMs:│
        │       evalProvider.record({                       │
        │         composeCycleId: lastBroadcastCycleId,     │
        │         signal: 'negative',                       │
        │         source: 'user-implicit',                  │
        │         comment: `re-ask within ${dt}ms`,         │
        │         at: now                                   │
        │       })                                          │
        │     // continue normal planning                    │
        └───────────────────────────────────────────────────┘
```

### 4.2 Mechanisms

#### 4.2.1 Per-connection state initialization

When a client connects (WebSocket open), the runtime initializes
per-connection state:

- `lastBroadcastCycleId: string | null = null`
- `lastBroadcastAt: number = 0`

Per-connection (not per-runtime) is essential because two users on the
same runtime are independent — a user-A message shouldn't fire a re-ask
signal on a user-B layout.

#### 4.2.2 Cycle stamping on broadcast

Every time the runtime calls `broadcastLayout(layout)`:

```
lastBroadcastCycleId = layout.composeCycleId
lastBroadcastAt = Date.now()
```

This is a **per-broadcast** update, not per-compose. If the runtime
composes multiple layouts in response to one envelope, only the most
recently broadcast one is the candidate for re-ask attribution.

#### 4.2.3 Re-ask detection

When the runtime receives a `user-message` envelope on the WebSocket:

```
if (envelope.type === 'user-message'
    && implicitReaskWindowMs > 0
    && lastBroadcastCycleId !== null
    && (Date.now() - lastBroadcastAt) < implicitReaskWindowMs) {

  evalProvider.record({
    composeCycleId: lastBroadcastCycleId,        // ← attributed to PRIOR layout
    sessionId,
    signal: 'negative',
    source: 'user-implicit',
    comment: `re-ask within ${Date.now() - lastBroadcastAt}ms`,
    at: new Date().toISOString()
  })
}

// then proceed with normal planner+composer flow
```

Critical detail: the signal is recorded BEFORE the planner runs on the new
message. The recording is for the OLD layout (the one the user wasn't
satisfied with). The new message then triggers a fresh plan + compose;
that one will produce its own layout and the timer resets.

#### 4.2.4 Distinguishing user-message from action emits

The window only fires on `envelope.type === 'user-message'`. **Action emits
(button clicks) DO NOT trigger the implicit signal**, because clicking a
button is a positive engagement signal — the user found the rendered UI
useful enough to interact with. Only fresh natural-language input (which
implies the user is restating their need rather than completing the task
the prior layout served) fires the inference.

#### 4.2.5 Window calibration

The `implicitReaskWindowMs` is a tunable parameter. Empirical defaults:

- **8 seconds** (the reduced-to-practice default): catches quick "wait, I
  meant something else" reformulations.
- **3 seconds**: more conservative; only catches very-rapid corrections.
  Lower false-positive rate, lower true-positive rate.
- **30 seconds**: catches slower reformulations (user paused to read +
  re-asked). Higher false-positive rate.

Setting the window to 0 disables the inference entirely.

#### 4.2.6 Failure modes + mitigations

- **Legitimate quick follow-ups** (user is satisfied AND quickly
  asks something related): false positive. The eval pipeline (P-005)
  weights `user-implicit` signals lower than `user-explicit` to compensate.
- **Slow user re-asks beyond the window**: false negative. Acceptable;
  the signal pipeline aggregates across many sessions, and the dropped
  signal is one data point in many.
- **Inactive WS connection** (browser tab in background): the cycle id +
  time persist in memory. If the user returns and types within the
  window, the inference still fires. This is correct behavior — the user
  presumably saw the prior layout before going away.

### 4.3 Embodiments

#### 4.3.1 Reduced-to-practice embodiment (this codebase)

- Per-WebSocket state.
- 8-second default window.
- KeyValueEvalProvider records the signal in-process.
- ChurnRiskCalculator (see P-005) consumes the signal in derived risk scores.

#### 4.3.2 Alternative embodiment — per-session vs per-WS

Replacing per-WS state with per-session state (sessionId-keyed) makes the
signal survive across WS reconnects. Same mechanism otherwise.

#### 4.3.3 Alternative embodiment — varying signal kinds by window

A two-band signal:
- < 3s window → strong negative (`signal: 'negative', score: -1`)
- 3-15s window → weak negative (`signal: 'negative', score: -0.5`)
- > 15s window → no signal

The reduced-to-practice embodiment uses a single binary band.

#### 4.3.4 Alternative embodiment — semantic similarity guard

Before recording, optionally compute embedding similarity between the new
user-message text and the prior turn's user-message text. If similarity
> threshold, the signal is "re-ask of the same intent" (strong); if
similarity < threshold, the signal is "user moved on" (weak; possibly
suppress). This is an enrichment that requires an embedding provider; not
in the reduced-to-practice embodiment.

### 4.4 Code references (reduction to practice)

```
packages/runtime/src/transport/server.ts:handleWsConnection
   ─→ per-WS lastBroadcastCycleId, lastBroadcastAt initialization
   ─→ broadcast tracking in the planner success path
   ─→ user-message intercept that fires the signal
packages/runtime/src/transport/server.ts: implicitReaskWindowMs option
packages/runtime/src/eval/keyvalue.ts: stores user-implicit signals
packages/runtime/src/transport/server.test.ts:
   ─→ "records a negative/user-implicit signal when a user-message arrives within the re-ask window"
   ─→ "does NOT record an implicit signal when implicitReaskWindowMs=0"
packages/runtime/src/churn/rule-based.ts:
   ─→ consumes the recorded user-implicit signals in risk derivation
```

## 5. Drawings

### Figure 1 — Re-ask timing diagram

```
  T=0     Server broadcasts Layout L1 (cycleId=C1).
          lastBroadcastCycleId = C1
          lastBroadcastAt = 0ms

  T=2s    User reads L1.

  T=4s    User: "no, I meant something else"
          Server receives user-message at T=4s.
          Window check: (4000 - 0) < 8000ms → TRUE
          ──→ EvalProvider.record({
                composeCycleId: C1,
                signal: 'negative',
                source: 'user-implicit',
                comment: 're-ask within 4000ms'
              })
          Then: planner runs the new message → composes L2 (cycleId=C2).
          lastBroadcastCycleId = C2
          lastBroadcastAt = 4000ms (or whenever broadcast hits the wire)

  T=7s    User clicks a button on L2.
          Action emit envelope. type ≠ 'user-message'.
          Window check NOT triggered. No signal recorded for L2.
          (User engaged with L2 — that's positive signal, captured separately.)

  T=20s   User: "now show me the next page"
          (20000 - 4000) > 8000ms → FALSE. No re-ask signal.
          User is moving forward, not re-asking.
```

### Figure 2 — Decision flow

```
   user-message envelope arrives
          │
          ▼
   ┌──────────────────────────────────┐
   │ implicitReaskWindowMs > 0 ?      │ — disabled if 0
   └──────────────┬───────────────────┘
                  │ yes
                  ▼
   ┌──────────────────────────────────┐
   │ lastBroadcastCycleId != null ?   │ — first message, nothing to score
   └──────────────┬───────────────────┘
                  │ yes
                  ▼
   ┌──────────────────────────────────┐
   │ (now - lastBroadcastAt) < window │ — old broadcasts don't trigger
   └──────────────┬───────────────────┘
                  │ yes
                  ▼
            record signal
   { composeCycleId: lastBroadcastCycleId,
     signal: 'negative', source: 'user-implicit',
     comment: `re-ask within ${dt}ms` }
                  │
                  ▼
            continue normal planner flow
```

## 6. Claims (drafted broadly — for attorney review)

### Claim 1 (independent method claim)

A computer-implemented method for inferring user dissatisfaction signals
in an AI-agent system, the method comprising:

(a) at a server runtime, broadcasting a UI artifact to a client, the UI
artifact comprising a unique compose-cycle identifier;

(b) at the server runtime, recording a broadcast timestamp associated with
the UI artifact;

(c) at the server runtime, receiving from the client a typed user-message
envelope comprising a natural-language input;

(d) determining, at the server runtime, whether the elapsed time between
the broadcast timestamp and the receipt of the user-message envelope is
less than a configured re-ask window;

(e) responsive to the determination of (d) that the elapsed time is less
than the re-ask window, automatically recording a negative quality signal
in a quality-signal store, the negative quality signal being attributed to
the UI artifact via the compose-cycle identifier and tagged with a source
indicator distinguishing implicitly-inferred signals from explicitly-
provided user feedback;

(f) at the server runtime, processing the user-message envelope through a
planner pipeline to produce a subsequent UI artifact, regardless of
whether the determination of (d) recorded a signal.

### Claim 2 (dependent — action emit exclusion)

The method of claim 1, wherein the determination of (d) is gated on the
envelope's type field being equal to a designated user-message type, and
wherein envelopes of other types — including envelopes representing user
interaction with rendered layout elements — do not trigger the recording
of step (e).

### Claim 3 (dependent — per-connection state)

The method of claim 1, wherein the broadcast timestamp and compose-cycle
identifier are maintained in a per-client-connection state, such that
user-message envelopes received from one client do not trigger recordings
attributed to UI artifacts broadcast to another client.

### Claim 4 (dependent — configurable window with disable)

The method of claim 1, wherein the re-ask window is a runtime-configurable
parameter, and wherein setting the parameter to zero disables the
recording of step (e) entirely.

### Claim 5 (dependent — feeding a churn-risk model)

The method of claim 1, further comprising:

(g) periodically computing, for each session, a churn-risk score derived
from the quality-signal store's signals attributed to that session,
wherein the negative quality signals tagged with the implicitly-inferred
source indicator contribute to the score.

### Claim 6 (independent system claim)

A system for inferring user-dissatisfaction signals in an AI-agent runtime,
the system comprising:

a server runtime configured to broadcast UI artifacts to clients, each UI
artifact carrying a unique compose-cycle identifier;

a per-client-connection state store recording, for each connected client,
a most-recent broadcast compose-cycle identifier and a most-recent
broadcast timestamp;

a quality-signal store; and

a re-ask inference component configured to:
  - receive user-message envelopes from connected clients;
  - upon receipt, query the per-client-connection state store for the
    associated client's most-recent broadcast timestamp;
  - if the elapsed time is below a configured re-ask window, record a
    negative quality signal in the quality-signal store, the signal
    being attributed to the most-recent broadcast compose-cycle
    identifier and tagged with an implicitly-inferred source indicator;
    and
  - regardless of whether a signal was recorded, forward the
    user-message envelope to a planner pipeline.

### Claim 7 (independent computer-readable medium claim)

A non-transitory computer-readable medium storing instructions that, when
executed by one or more processors, cause the one or more processors to
perform the method of claim 1.

## 7. Prior art — known references

| Reference | What it teaches | What it doesn't teach |
|---|---|---|
| Web search re-query analysis (2000s+) | Reformulation patterns identified at the query level. | Operates on text queries against a search index; not applied to AI-agent-emitted UI artifacts; not attributed to specific UI artifacts via cycle ids. |
| Click-through rate as implicit signal (web search, e-commerce, 2000s+) | User CLICKS on results indicate satisfaction. | Doesn't address the inverse: NO clicks + a fresh query within a window. |
| Dwell time on result pages | Long dwell ≈ engaged; short dwell ≈ unsatisfied. | Doesn't bind to specific server-emitted artifacts in agent context; doesn't use natural-language re-input as the signal trigger. |
| Conversation-abandonment metrics (chatbot literature, 2010s+) | If user disengages within N turns, conversation deemed unsuccessful. | Operates at the conversation level, not the per-artifact level. |
| Anthropic / OpenAI / Google explicit thumbs-feedback widgets | User-provided binary feedback per response. | Only EXPLICIT signal capture; doesn't infer signals from absence of action + re-ask. |
| US 10,936,664 (search session quality metrics) | Computes quality from session-level user behavior. | Aggregate over a session, not per-result-artifact attribution; not in agent context. |
| US 11,609,909 (interactive feedback for ML models) | Feedback widgets for ML model output. | Explicit feedback only. |

## 8. Apache 2.0 implications

Same as P-001 — Apache 2.0 §3 grants apply; provisional filing preserves
commercial-license + defensive-counterclaim rights.

This is the strongest patent candidate in the disclosure portfolio per
STRATEGY.md (Bucket A — file before OSS publish).

## 9. Open questions for counsel

1. **Independent claim 1 breadth**: should "natural-language input" be
   replaced with "any user input"? Broader = more prior art risk; narrower
   = easier to grant.
2. **Action-emit exclusion in claim 2**: is this claim narrow enough to
   distinguish from prior search-result CTR systems? Examiner may push
   back.
3. **The window value as a parameter**: is the configurability claim worth
   defending? Most useful systems have a fixed window; the configurability
   isn't the inventive aspect but it's a useful narrowing.
4. **Combination claim with churn-risk derivation (P-005)**: should we
   file P-004 + P-005 as a single application with a combination claim,
   or as two separate filings? Single = cheaper; separate = more robust
   to one being rejected.
