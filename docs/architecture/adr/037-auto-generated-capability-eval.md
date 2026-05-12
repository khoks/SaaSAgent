# ADR-037: Auto-generated per-capability eval pipeline

- **Status**: accepted
- **Date**: 2026-05-11
- **Supersedes**: —
- **Superseded by**: —

## Context

[ADR-023](./023-eval-loop.md) (groomed earlier) established that the
platform's eval suite is **auto-generated from registry metadata** rather
than hand-authored per capability. The runtime knows every registered
skill, tool, and sub-agent because they all flow through the
SkillRegistry / ToolRegistry / SubAgentRegistry. That metadata — name,
description, `whenToUse`, input/output schemas, kind, timeouts — is enough
to derive both heuristic checks and (in a later slice) LLM-judge prompts.

This ADR fixes the implementation shape that lands in Phase 6.

The existing [`EvalProvider`](../../../packages/runtime/src/eval/) (Phase 2.5)
records *user-feedback signals* (👍/👎/implicit re-ask) on composed layouts.
That captures whether the user liked the response. The new
`CapabilityEvalRunner` captures whether each underlying capability
*invocation* worked well — a different and complementary signal. Together
they answer two questions:

| Layer | Question | Source |
|---|---|---|
| `EvalProvider` | Did the user think this turn was good? | User feedback + implicit re-ask |
| `CapabilityEvalRunner` | Did the skills/tools/sub-agents the planner chose work? | Executor invocation records |

A skill that always fails will degrade user satisfaction; capability eval
catches it *before* user feedback piles up.

## Open questions resolved

1. **What dimensions get scored heuristically?** Three for MVP, all cheap
   and pure:
   - `outcome-success` — did the executor return ok=true?
   - `output-non-empty` — was the payload not null/empty?
   - `latency-budget` — did the call finish under target (default 1000ms),
     scoring linearly down to 0 at 4× target?
2. **Where does the runner sit?** Hooked into each executor via an optional
   `onInvocation(record)` callback. Non-invasive — executors keep working if
   no hook is attached, and host-authored executors can attach their own
   hooks for custom collection. The runtime auto-constructs its three
   executors with the runner pre-attached unless the host overrides them.
3. **Storage shape?** In-memory ring buffer (default 200 invocations per
   capability) + parallel per-check result buffer. Reports aggregate from
   the ring on each `reportFor` / `reportAll`. Durable backing (ClickHouse,
   mirroring `ClickHouseEvalProvider`) lands in v1 behind the same interface.
4. **REST surface?** Two endpoints:
   - `GET /evals/capabilities` — all reports, worst-first
   - `GET /evals/capabilities/<name>` — single report (404 if never seen)
   `/health` also surfaces `capabilityEvalRunner` name + `capabilityEvalCount`
   so a dev integration can confirm the runner is wired without driving
   traffic first.
5. **Dashboard tech?** Self-contained HTML page served at `GET /dashboard`.
   Vanilla JS, no build step, polls `/evals/capabilities` every 3 seconds.
   This meets the Phase 6 gate (*"dashboard shows auto-generated metrics
   for at least 1 Skill + 1 Sub-Agent + 1 Feature"*) without adding a React
   build to the runtime package. The richer SPA from ADR-030 grows out of
   this in v1.
6. **LLM-judge?** Deferred. The hybrid scoring promised in ADR-023 (heuristics
   every interaction + LLM-judge sampled ~5%) extends naturally — add a
   second `evaluateAsync(invocation, descriptor)` interface that calls
   AnthropicProvider sampled at the configured rate. Out of scope for the
   first implementation slice; the heuristic path lands now.

## Decision

Adopt the `CapabilityEvalRunner` abstraction with one first-party
implementation (`InMemoryCapabilityEvalRunner`), a built-in default
heuristic suite of three checks, and two REST endpoints plus a bundled
dashboard.

### Interface

```ts
interface CapabilityEvalRunner {
  readonly name: string;
  recordInvocation(record: CapabilityInvocationRecord): void;
  reportFor(name: string): CapabilityReport | null;
  reportAll(): readonly CapabilityReport[];
  reset?(): void;
}
```

### Wire shape

```ts
interface CapabilityInvocationRecord {
  name: string; kind: 'skill' | 'tool' | 'subagent';
  at: string; composeCycleId?: string; sessionId?: string;
  input?: unknown; output?: unknown;
  ok: boolean; errorCode?: string; errorMessage?: string;
  durationMs: number;
}

interface CapabilityReport {
  name: string; kind: 'skill' | 'tool' | 'subagent';
  totalInvocations: number; okCount: number; failureCount: number;
  successRate: number;            // 0..1
  medianLatencyMs: number; p95LatencyMs: number;
  overallScore: number | null;    // mean of per-check means, 0..1
  perCheck: Record<string, { mean: number; sampleSize: number }>;
  lastSeenAt: string | null;
}
```

### Executor integration

Each of `SkillExecutor`, `ToolExecutor`, `SubAgentExecutor` takes an
optional `onInvocation(record)` callback. The hook fires after `execute()`
returns, regardless of success/failure. Errors thrown by the hook are
swallowed so a misbehaving recorder cannot break the hot path.
`RuntimeServer` auto-constructs its three executors with the runner's
`recordInvocation` bound; host-overridden executors are NOT mutated and
should bind their own hook.

## Consequences

### Positive

- **Meets the Phase 6 gate**: dashboard shows live metrics for any
  registered capability the moment it's invoked.
- **No per-capability eval authoring**: integrators register a skill and
  it gains a quality scorecard for free.
- **Cheap on the hot path**: three pure-function checks, no I/O, ring
  buffer eviction is O(1) amortized. The runner overhead per invocation
  is microseconds.
- **Worst-first ordering**: `reportAll()` sorts by `overallScore` ascending
  so reviewers see what to fix.
- **Composable with existing eval**: `CapabilityEvalRunner` and
  `EvalProvider` are orthogonal — same observation surface, different
  signals. Future churn calculators can read both.
- **Patent angle**: novelty here is *auto-generating* the eval from
  registry metadata, not the eval execution itself. Worth a P-006
  disclosure later (companion to P-005 on explainable churn).

### Negative

- **In-memory only at MVP**: a restart wipes the buffer. Acceptable for
  Phase 6 — the dashboard is for the live session; durable analytics are
  in `ClickHouseEvalProvider` v1 (same interface).
- **No LLM-judge yet**: the harder-to-evaluate questions ("did this skill
  actually fulfill its `whenToUse`?") require a model call. We get
  diagnostic value from the heuristics alone, but quality assessment is
  partial until LLM-judge ships.
- **Buffer size is a tunable**: 200 per-capability is a default; bursts
  beyond that get evicted. Hosts that need full retention plumb in the
  durable v1 provider.

### Neutral

- Heuristic suite is overridable in the constructor. Hosts that want to
  add a custom check (e.g. schema-conformance against the descriptor's
  inputSchema) pass their own list.

## Implementation references

- Runner + types: [packages/runtime/src/capeval/](../../../packages/runtime/src/capeval/)
- Executor hooks:
  [skill.ts](../../../packages/runtime/src/executor/skill.ts) (also
  defines `fireOnInvocation` reused by tool + subagent)
- REST + dashboard:
  [packages/runtime/src/transport/server.ts](../../../packages/runtime/src/transport/server.ts)
  (search "Phase 6" markers)
- Dashboard HTML:
  [packages/runtime/src/transport/dashboard.ts](../../../packages/runtime/src/transport/dashboard.ts)

## References

- [ADR-023](./023-eval-loop.md) — original eval-loop grooming decision; this
  ADR is its first implementation slice.
- [ADR-030](./030-eval-dashboard-tech.md) — bundled SPA dashboard target;
  the vanilla-JS page in this ADR is the MVP step toward that.
- [ADR-032](./032-clickhouse-eval-provider.md) — durable signal storage;
  the runner's interface accommodates a future ClickHouse-backed variant.
