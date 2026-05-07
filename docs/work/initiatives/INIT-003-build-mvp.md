# INIT-003 — Build MVP runtime + embeddable shell

- **Status:** in-progress (Phases 0+1+2 done; Phase 3 next)
- **Created:** 2026-04-26
- **Last updated:** 2026-05-06
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

### Phase 0 — Foundation (done 2026-05-06)
- **EPIC-002** Monorepo skeleton (pnpm + Turborepo, package layout, base tsconfig, root scripts)
- **EPIC-003** Local infrastructure (Docker Compose with full polyglot stack, healthchecks, dev/test profiles)
- **EPIC-004** CI baseline (GitHub Actions: install + build + lint + test)
- **EPIC-005** Runtime package skeleton (`@saasagent/runtime`) with Claude Agent SDK substrate wiring stub
- **EPIC-006** SDK-TS package skeleton (`@saasagent/sdk`) with placeholder federation interfaces
- **EPIC-007** Web shell package skeleton (`@saasagent/web-shell`) with `<saas-agent />` custom element
- **EPIC-008** CLI package skeleton (`@saasagent/cli`) with `agentsaas` binary entrypoint

**Phase 0 gate:** `pnpm install && pnpm infra:up && pnpm build && pnpm test` succeeds end-to-end on a fresh clone.

### Phase 1 — Composition (done 2026-05-06)
- WC shell (side-panel render mode)
- Atomic UI Components registry schema + storage + hot-reload
- Theme tokens registry (DTCG canonical + Style Dictionary importer + CSS variable fallback)
- UI Composer (Haiku + cached layout templates per intent + Sonnet fallback)
- Bidirectional typed-JSON instruction protocol
- Native-renderer escape hatch primitive

**Phase 1 gate:** end-to-end composed artifact renders from a hand-crafted layout-tree input.

### Phase 2 — Planning *(MVP-of-MVP gate — done 2026-05-06, 384 tests @ commit fb17407)*
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

### Phase 5 — Multimodal + proactive
- DOM observation (MO + IO + custom semantic events from host via Adapters registry)
- Microphone capture (VAD + transcription)
- Narration via TTS
- Element highlight + programmatic click on host page
- Multi-signal proactive scoring (planner conf + memory match + workflow continuity + DOM relevance + time-since)
- Hard-cap attention budget (host-configurable defaults)

**Phase 5 gate:** day-2 proactive re-engagement demo runs end-to-end.

### Phase 6 — Eval
- Auto-generated per-capability eval (parses registry metadata → heuristic checks + LLM-judge prompts)
- Bundled eval backend (ClickHouse storage, scoring runners, regression detection, alerting hooks)
- Bundled SPA dashboard (React + chart lib, embedded in admin UI)
- Hybrid scoring (heuristics every interaction + LLM-judge sampled ~5%)

**Phase 6 gate:** dashboard shows auto-generated metrics for at least 1 Skill + 1 Sub-Agent + 1 Feature.

### Phase 7 — Tier/quota
- Per-user request/token tracking (PG + ClickHouse)
- Tier definitions (host-configurable)
- Configurable enforcement (hard / soft + warning / unlimited per tier)
- Visible "X requests remaining" composed UI element

**Phase 7 gate:** end-user crosses 80% threshold → composed visibility element renders.

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

### Phase 9 — Mobile + distribution + IP gate + OSS publication
- WebView bridge (iOS + Android native shims)
- Mobile-context-aware composer adaptation
- Mobile demo polish
- Helm chart hardened for production
- Docker Compose dev/demo polished
- Getting-started guide (`< 60 min from clone to running demo`)
- NFR validation (latency, scale, ops)
- **Provisional patent filings** for high-novelty entries (per ADR-035) — gate before public OSS
- Apache 2.0 license file added
- Repo flipped to public
- OSS publication announcement

**Phase 9 gate:** all INIT-002 acceptance criteria satisfied; repo public; patents filed.

## Open dependencies (Batch 6)

Non-blocking but may shape some Phase 1+ details:
- Q6.3 Real-time transport (proposed default: SSE for streaming + WebSocket for bidirectional emit) — confirm before Phase 1.
- Q6.4 Adapters transport (proposed: webhook MVP, SDK adapter library v1).

Pure post-MVP:
- Q6.1 Cross-store consistency.
- Q6.2 Federated learning v2.

## Child epics

Owned + maintained by the work-management skill.

**Phase 0 (done):** EPIC-002 through EPIC-008 (see epics/INDEX.md)
**Phase 1 (done):** EPIC-009
**Phase 2 (done):** EPIC-010
**Phase 3 (partial — Sub-Agent SDK done):** EPIC-011; EPIC-014 (STORY-010)
**Phase 4 (partial — Qdrant/ClickHouse/Kafka/Neo4j providers done):** EPIC-012; EPIC-015
**Phase 5 (partial — mobile-context, render modes, DOM observation done):** EPIC-013; EPIC-014 (STORY-007, 008, 009)
**Phase 8 (partial — demo-ecommerce + demo-travel initial builds done):** EPIC-014 (STORY-012)

> **EPIC-014** — [Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md) (done 2026-05-06, commit `c46a366`, 468 tests)
> **EPIC-015** — [Bucket B: Polyglot storage providers sprint](../epics/EPIC-015-bucket-b-polyglot-storage.md) (done 2026-05-06, commit `c46a366`, 468 tests)
