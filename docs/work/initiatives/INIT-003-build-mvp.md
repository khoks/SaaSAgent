# INIT-003 — Build MVP runtime + embeddable shell

- **Status:** in-progress (Phases 0-7 + 9 partial done; patents pending → blocking OSS publication)
- **Created:** 2026-04-26
- **Last updated:** 2026-05-12
- **Outcome:** A working MVP that satisfies all acceptance criteria in [INIT-002](INIT-002-define-mvp-and-design-partner.md), demonstrates the substrate end-to-end against e-commerce + travel design-partner archetypes, and grounds the provisional patent filings.

## Why
Documentation alone does not validate a substrate. The MVP is the proof — both for the product/market and for the patent applications.

## Done when
- All [INIT-002 acceptance criteria](INIT-002-define-mvp-and-design-partner.md#acceptance-criteria) satisfied.
- Provisional patent filings completed (ADR-035) → repo can flip to public.
- Apache 2.0 OSS publication done.
- Demo script reliably executes end-to-end against both verticals.

## Build team (per [ADR-036](../../decisions/decision-log.md))
Rahul (PM + engineer) + Claude (AI engineer). No external hires.

## Tooling
- **Monorepo:** pnpm workspaces + Turborepo (TS); Python SDK in `packages/sdk-py` ([ADR-037](../../decisions/decision-log.md))
- **Language:** TypeScript (strict) for runtime/SDK/shell/CLI; Python for Python SDK + churn model training
- **Test:** Vitest (TS); pytest (Python)
- **Lint/Format:** ESLint + Prettier (TS); ruff + black (Python)
- **CI:** GitHub Actions
- **Local infra:** Docker Compose with full stack (PG + Qdrant + Redpanda + ClickHouse + Neo4j) per [ADR-032](../../decisions/decision-log.md)

## Phases & epics

### Phase 0 — Foundation — **done** 2026-05-03
- [EPIC-007 — Phase 0 Foundation](../epics/EPIC-007-phase-0-foundation.md) — **done** (monorepo skeleton, 4 package skeletons, CI, ADR-032–037)

**Phase 0 gate:** `pnpm install && pnpm build && pnpm test` succeeds end-to-end on a fresh clone. ✅

### Phase 1 — Composition — **in-progress** (gate satisfied 2026-05-03)
- [EPIC-008 — Phase 1 Composition](../epics/EPIC-008-phase-1-composition.md) — **in-progress** (gate ✅)
  - ✅ **Slice 1.1** — `@saasagent/protocol` package, stub UIComposer, layout renderer skeleton, bidirectional loop validated in JSDOM (18 tests) — `5a4c97c`
  - ✅ **Slice 1.2** — Real SSE + WebSocket transport; `/health`, `/sse`, `/ws` endpoints; 29 tests; full bidirectional loop over live network — `b796d02`
  - Slice 1.3 — WC shell side-panel + atomic component registry *(backlog)*
  - Slice 1.4 — Theme tokens registry *(backlog)*
  - Slice 1.5 — Live UI Composer (Haiku + cached templates + Sonnet fallback) *(backlog)*

**Phase 1 gate:** end-to-end composed artifact renders from a hand-crafted layout-tree input. ✅ **Satisfied 2026-05-03** — Composer → SSE → renderer → click → WS → re-compose → SSE → re-render proven over live network.

### Phase 2 — Planning *(MVP-of-MVP gate)*
- Planner (Sonnet, on Claude Agent SDK)
- Three-tier capability invocation (Tools / Skills / Sub-Agents)
- Basic Skills execution (in-process, process-isolated)
- Basic Tools execution (HTTP)
- Features/Services registry (`.feature.md` reader; super-skill-doc consumption — no compilation)
- Adapters registry (data adapters + custom-event channels)
- Memory accessor router (PG + Qdrant queries)

**Phase 2 gate:** end-to-end conversational turn — user input → planner → composer → composed UI artifact → user interaction emit → planner re-plan → next artifact. Demonstrates the full bidirectional loop with at least 1 Skill, 1 Tool.

### Phase 3 — Sub-Agent federation
- TS Sub-Agent SDK (`@saasagent/sdk`)
- Python Sub-Agent SDK (`@saasagent/sdk-py`)
- Boilerplate templates per language (`agentsaas init sub-agent --lang ts|py`)
- HTTP REST endpoints for admin (registration, health, registry, metadata)
- gRPC bidirectional streaming for runtime (planner ↔ sub-agent)
- Push self-registration on startup
- Heartbeat + TTL for cleanup
- mTLS via internal CA
- Sub-Agents registry integration with planner

**Phase 3 gate:** a Python sub-agent registers, the planner invokes it over gRPC streaming, intermediate results compose progressively.

### Phase 4 — Memory + closed-loop VoC + churn (per ADR-032)
- Full polyglot derivation pipeline (Redpanda topics for raw → derived)
- Time-tiered summarizers (session/day/week/month/year → ClickHouse)
- Problem-Solution Graph extractor + Neo4j integration
- VoC extractor (pain points / capability requests / friction patterns)
- VoC dashboard surface (embedded SPA)
- VoC Slack-digest surface
- VoC reprocessing back into customer interaction profile
- Customer Churn ML Model (LightGBM, generic-prior cold-start, SHAP explainability)
- Churn-aware planner gating (suppress high-risk feature surfacing)
- Active + deduced feedback substrate

**Phase 4 gate:** demo shows VoC signals flowing → churn model predicting → planner suppressing a feature for a similar customer → improvement visible in eval dashboard.

### Phase 5 — Multimodal + proactive — **done** 2026-05-12
- DOM observation (MO + IO + custom semantic events from host via Adapters registry) ✅
- Mobile-context detection (deviceClass/viewportWidth/inputMode/networkClass) ✅
- Multi-signal proactive scoring (6 signals: planner-conf, memory-match, workflow-continuity, DOM-relevance, time-since, VoC-pain-density) ✅ ADR-038
- Hard-cap attention budget (host-configurable, default 3 fires/conversation) ✅
- Per-WS idle tick (5 s interval) ✅

**Phase 5 gate:** day-2 proactive re-engagement demo runs end-to-end. ✅ **Satisfied 2026-05-12** — proactive layout fired without user input in Chrome (Expedia demo). See EPIC-011, STORY-029.

### Phase 6 — Eval — **done** 2026-05-12
- Auto-generated per-capability eval (3 heuristics: outcome-success, output-non-empty, latency-budget) ✅
- Ring-buffer per-capability eval runner (last 100 invocations) ✅
- `onInvocation` hooks wired into all three executors (skill/tool/subagent) ✅
- Self-contained HTML dashboard at `GET /dashboard`, worst-first ordering, polls every 3 s ✅ ADR-037

**Phase 6 gate:** dashboard shows auto-generated metrics for at least 1 Skill + 1 Sub-Agent + 1 Feature. ✅ **Satisfied 2026-05-12** — 6 capabilities tracked live in Chrome. See EPIC-012, STORY-030.

### Phase 7 — Tier/quota — **done** 2026-05-12
- `TierProvider` interface + `InMemoryTierProvider` with host-configurable tiers + UTC-day reset ✅ ADR-036
- `QuotaBanner` web-shell widget (gray/amber/red states) ✅
- Quota enforcement in WS before planner invocation; exceeded → `quota-exceeded` layout ✅
- Per-user token tracking (PG + ClickHouse) ⚠️ deferred post-MVP (in-memory only)

**Phase 7 gate:** end-user crosses 80% threshold → composed visibility element renders. ✅ **Satisfied 2026-05-12** — all 3 banner states verified live in Chrome (Expedia demo, free tier = 5 req/day). See EPIC-013, STORY-009.

### Phase 8 — Demo verticals (e-commerce + travel)
- E-commerce mock host app (`apps/demo-ecommerce`)
- Travel mock host app (`apps/demo-travel`)
- Atomic primitive registries per vertical
- Themes per vertical
- Feature/Service docs per vertical
- Sub-Agents per vertical (recommendation; trip planning)
- Skills per vertical (price-comparison; itinerary-builder)
- Mock host APIs
- Demo session scripts polished + repeatable

**Phase 8 gate:** both 10-beat demo scripts execute reliably end-to-end without intervention.

### Phase 9 — Mobile + distribution + IP gate + OSS publication — **in-progress**
- Getting-started guide (`< 60 min from clone to running demo`) ✅ 2026-05-12
- NFR validation (latency, scale, ops) ✅ 2026-05-12
- OSS publish-gate checklist (8-item, Bucket-A filings as hard gate) ✅ 2026-05-12 ADR-039
- Apache 2.0 license file added ✅ 2026-05-12
- NOTICE file added ✅ 2026-05-12
- **Provisional patent filings** for high-novelty entries (per ADR-035) ❌ pending real-world action
- WebView bridge (iOS + Android native shims) ❌ deferred
- Helm chart hardened for production ❌ deferred
- Repo flipped to public ❌ blocked on patent filings
- OSS publication announcement ❌ blocked on public flip

**Phase 9 gate:** all INIT-002 acceptance criteria satisfied; repo public; patents filed. ⏳ Blocked on patent filings. See EPIC-015, STORY-031, STORY-013.

## Open dependencies (Batch 6)

Non-blocking but may shape some Phase 1+ details:
- Q6.3 Real-time transport (proposed default: SSE for streaming + WebSocket for bidirectional emit) — confirm before Phase 1.
- Q6.4 Adapters transport (proposed: webhook MVP, SDK adapter library v1).

Pure post-MVP:
- Q6.1 Cross-store consistency.
- Q6.2 Federated learning v2.

## Child epics

Owned + maintained by the work-management skill.

| Epic | Title | Status |
|---|---|---|
| [EPIC-002](../epics/EPIC-002-phase-0-foundation.md) | Phase 0 Foundation skeleton | done |
| [EPIC-003](../epics/EPIC-003-phase-1-composition.md) | Phase 1 Composition layer | done |
| [EPIC-004](../epics/EPIC-004-phase-2-planning-core.md) | Phase 2 Planning core | done |
| [EPIC-005](../epics/EPIC-005-phase-2-deferred-hardening.md) | Phase 2 deferred items + hardening | done |
| [EPIC-006](../epics/EPIC-006-bucket-a-cross-cutting.md) | Bucket A cross-cutting capabilities | done |
| [EPIC-007](../epics/EPIC-007-bucket-b-data-providers.md) | Bucket B data store providers | done |
| [EPIC-008](../epics/EPIC-008-bucket-c-auth-telemetry-ml.md) | Bucket C auth, telemetry, ML, and E2E | done |
| [EPIC-009](../epics/EPIC-009-patents-track.md) | Patents track — IP preparation | in-progress |
| [EPIC-010](../epics/EPIC-010-expedia-demo-vertical.md) | Expedia demo vertical (Phase 8) | in-progress |
| [EPIC-011](../epics/EPIC-011-phase5-multimodal-proactive.md) | Phase 5 multimodal + proactive engine | done |
| [EPIC-012](../epics/EPIC-012-phase6-auth-telemetry-hardening.md) | Phase 6 eval pipeline + dashboard | done |
| [EPIC-013](../epics/EPIC-013-phase7-tier-quota.md) | Phase 7 tier/quota enforcement | done |
| [EPIC-015](../epics/EPIC-015-phase9-mobile-distribution-ip.md) | Phase 9 mobile + distribution + OSS | in-progress |
