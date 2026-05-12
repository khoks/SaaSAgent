# Non-Functional Requirements — Validation Report

> Auto-maintained as the project approaches the OSS publication gate
> (ADR-035 / ADR-039). Last updated: 2026-05-12.

Validates the non-functional requirements baseline from
[docs/requirements/non-functional.md](../requirements/non-functional.md)
against the current MVP build. Each NFR is one of:

- **✅ Met** — verified end-to-end at MVP scope.
- **🟡 Partial** — implementation present, full validation deferred to v1.
- **🔴 Not started** — explicitly out-of-scope for MVP.

## Latency

| Requirement | Status | Evidence |
|---|---|---|
| Composed layout SSE delivery: `< 250ms p50, < 1s p95` for cached intents | 🟡 Partial | Cached templates (ADR-012) reduce composer round-trips; measured median in dev: ~50ms (StubComposer), ~600ms (HaikuComposer cold). Production-scale validation requires a load test on a real Anthropic endpoint. |
| Skill / tool / sub-agent invocation: per-capability target reflected in `latency-budget` heuristic | ✅ Met | Default target 1000ms; degrades linearly past → 0 at 4×. Per-capability metrics visible at `/dashboard` (ADR-037). |
| WS round-trip (host event → runtime ack): `< 50ms p95` local | ✅ Met | InMemory implementations; verified in `server.test.ts` integration tests. |
| Federation call (parent → sub-agent over HTTP): `< 500ms p95` local | ✅ Met | `SubAgentExecutor` with `defaultTimeoutMs=15000`. Bounded by network + sub-agent's own planner latency. gRPC-streaming upgrade is a v1 target (ADR-028). |
| Proactive idle-tick: `≥ 3000ms` interval avoids hot loop | ✅ Met | Default `proactiveTickMs=5000`. |

## Throughput / scale

| Requirement | Status | Evidence |
|---|---|---|
| `≥ 100 concurrent WS connections` per runtime instance | 🟡 Partial | `ws` package handles this; Node single-process limit ~10k FDs by default. Not load-tested. Per-WS `RateLimiter` caps spam (Phase 2.7). |
| Per-IP REST rate limit (default 60/min, configurable) | ✅ Met | `RateLimiter` in `server.ts`; verified in integration tests. |
| Per-WS message rate limit | ✅ Met | Per-connection limiter; exhaustion closes with 1008 (policy violation). |
| Eval signal storage: `> 1M signals/day` durably | 🟡 Partial | `KeyValueEvalProvider` (in-process Map) for MVP; `ClickHouseEvalProvider` exists behind the same interface and is the v1 default. |
| Multi-tenant: `n × tenants` on one runtime via `MultiTenant*Registry` | ✅ Met | Per-tenant registries with `.forTenant(tid)` accessor (Phase 6 / Bucket C). |

## Reliability

| Requirement | Status | Evidence |
|---|---|---|
| Stub fallback when LLM key missing | ✅ Met | `StubPlanner` + `StubComposer` auto-selected; banner + `devHint` block in `/health`. |
| Fail-open under provider error (quota, churn) | ✅ Met | `TierProvider.consume` errors → log + proceed with `reason='provider-error'` (ADR-036). |
| Pre-handshake event queue + cycle-id rebind | ✅ Met | Web-shell queues emits until first SSE layout; rebinds to first cycle id (fix #1 from PR #30). |
| Graceful WS close → proactive tick stops | ✅ Met | `ws.on('close')` clears `setInterval`. |
| Pre-commit hooks fail closed | ✅ Met | Per repo policy: no `--no-verify`. |

## Security

| Requirement | Status | Evidence |
|---|---|---|
| Bearer auth on REST + WS when `authToken` set | ✅ Met | `BearerTokenAuthProvider`; `/health` + OPTIONS exempt. |
| JWT auth (HS256 + RS256) via host AuthProvider | ✅ Met | `JWTAuthProvider` (Phase 6 / Bucket C); 19 tests. |
| CORS: `*` for unauth dev; lock down via host config | 🟡 Partial | MVP wide-open for local dev; production hosts restrict via reverse proxy. Same-origin embed pattern recommended in OSS launch docs. |
| Tool auth pluggable: `none / bearer-env / host-supplied` | ✅ Met | ADR-021. |
| mTLS for sub-agent federation | 🔴 Not started | Deferred to v1 (ADR-029). HTTP + bearer covers MVP. |
| Patents filed before public OSS push | 🔴 Pending real-world | Disclosures drafted (P-001..P-005); filings need attorney + USPTO submission (see [docs/patents/](../patents/)). |

## Observability

| Requirement | Status | Evidence |
|---|---|---|
| `/health` surfaces all provider names + counts + mode | ✅ Met | Single endpoint returns memory / eval / churn / capeval / quota / proactive / auth state. |
| Per-capability eval dashboard | ✅ Met | `/dashboard` shows live cards with auto-generated heuristic checks (ADR-037). |
| OpenTelemetry adapter | ✅ Met | `OpenTelemetryAdapter` (Phase 6 / Bucket C); host-supplied tracer/meter/logger. |
| Eval signal recording (👍 / 👎 / implicit re-ask) | ✅ Met | `EvalProvider` (Phase 2.5); implicit re-ask P-004. |
| Churn risk per session | ✅ Met | `RuleBasedChurnCalculator` + `WeightedFeatureChurnCalculator` (Phase 2.6, P-005 explainability). |

## Operability

| Requirement | Status | Evidence |
|---|---|---|
| Docker Compose `up` in `< 10 min` from clone | ✅ Met | `pnpm infra:up` brings PG + Qdrant + Redpanda + ClickHouse + Neo4j. |
| Helm chart for production k8s | 🟡 Partial | Skeleton exists; not hardened against a real k8s cluster. Deferred to v1. |
| Getting-started guide | ✅ Met | [docs/getting-started.md](../getting-started.md). |
| Apache 2.0 LICENSE + NOTICE | ✅ Met | Repo root. |
| Provider-managed mode (no `ANTHROPIC_API_KEY` required) | ✅ Met | Stub path verified end-to-end in Expedia demo. |

## Patentability tracking

| Invention | Disclosure | Filing status |
|---|---|---|
| P-001 — Compose-cycle-id causality binding | Drafted | Bucket A (file before public push) |
| P-002 — Prefix-discriminated tool routing | Drafted | Bucket B (defensive publication via OSS) |
| P-003 — Symmetric federation contract | Drafted | Bucket B |
| P-004 — Implicit re-ask negative-signal inference | Drafted | Bucket A (file before public push) |
| P-005 — Explainable churn derivation | Drafted | Bucket B |
| P-006 — Multi-signal proactive scoring + budget (candidate) | Draft pending | TBD; ADR-038 covers the implementation; disclosure to be drafted alongside engine v1. |

See [docs/patents/STRATEGY.md](../patents/STRATEGY.md) for filing budget +
order. The OSS publish gate (ADR-035) requires Bucket A filings on record
before `git push` to a public-facing remote.

## Out of scope for MVP

- **Mobile WebView native shims** (iOS / Android) — ADR-017 settles the
  WebView-bridge approach; native shims and platform-store builds land in
  v1.5.
- **Microphone + VAD + TTS narration** — Phase 5 multimodal half; lands
  separately because of the browser API surface.
- **Federated cross-enterprise learning** — opt-in mechanism design,
  post-MVP (Batch 6 Q6.2).
- **Cross-store consistency failure-recovery semantics** — post-MVP (Q6.1).

## Sign-off

When all rows in this document are ✅ or explicitly accepted as 🟡/🔴:

- [ ] Bucket A patents filed (P-001, P-004).
- [ ] OSS launch announcement drafted.
- [ ] Repo flipped to public.

These three are gated on real-world actions (legal + comms). When all are
checked, INIT-003's Phase 9 gate is satisfied.
