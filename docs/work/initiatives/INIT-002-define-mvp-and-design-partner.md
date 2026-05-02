# INIT-002 — Define MVP slice and design-partner vertical

- **Status:** in-progress (drafted 2026-05-04 — pending Rahul review)
- **Created:** 2026-04-26
- **Last updated:** 2026-05-04
- **Outcome:** A written MVP scope that is the smallest demonstrable slice of the platform, paired with an explicit design-partner vertical (real or imagined) we are building toward.

## Why

Universal platforms die when they try to be universal on day one. We need an honest MVP cut that proves the substrate is real for one vertical, then expand. The MVP is the proof — not a feature-complete product.

## Anchor vertical

**E-commerce** ([ADR-003](../../decisions/decision-log.md)). Composite design partner archetype = **Walmart-/Best-Buy-/Shopify-merchant-tier** (real partner TBD; Rahul to source). Selected for: broadest TAM, clearest ROI demo (cart-abandonment recovery, product discovery, returns/support), mature event-bus patterns, React-heavy frontends (matches [ADR-015](../../decisions/decision-log.md)).

## Demo script (10-beat E2E)

The MVP must execute these beats reliably end-to-end:

1. **Setup** — host (e-commerce site) has installed the SaaS Agent platform via Helm chart on their k8s. Theme tokens (DTCG via Style Dictionary) + atomic UI primitives (ProductTile, Cart, FilterBar, ComparisonGrid, RecommendationCarousel, RequestsRemainingBadge, …) registered. One Feature/Service doc (`find-similar-product.feature.md`) authored. One Sub-Agent (Python recommendation engine) deployed and federated. One Skill (in-process price-comparison) and one Tool (host product API) registered. Adapters registry includes custom semantic events (`product.viewed`, `cart.itemAdded`, `checkout.started`).
2. **User browses** the host's product detail page for a Sony Bravia 55" TV. Agent observes via DOM (MO + IO) and the host's `product.viewed` custom event.
3. **User opens the agent panel** (side-panel WC shell render mode) and asks: *"Help me find a TV under $800 with similar features."*
4. **Planner (Sonnet)** parses intent, recalls user's interaction profile via Qdrant semantic search, selects relevant skill (`product-search`) + tool (host product API), composes a plan.
5. **UI Composer (Haiku)** composes a product-comparison artifact using host's atomic primitives (ProductTile + ComparisonGrid + FilterBar) and theme tokens, emits typed-JSON layout tree with data-wiring spec.
6. **WC Shell renderer** mounts referenced React components, applies theme, injects data, subscribes to interaction events. User sees on-brand comparison cards in the agent's scrolling pane.
7. **User clicks** "show more like Sony" on one card → typed JSON instruction emit back to runtime → planner re-plans → invokes the **Python recommendation Sub-Agent over gRPC**, which streams ranked candidates back → composer renders updated artifact with recommendations.
8. **Workflow tracking** — workflow `find-similar-product` registered active in Postgres; user's interaction trajectory captured in raw log; active feedback (user clicked "compare", scrolled past two cards) recorded.
9. **User abandons** without buying. Session ends.
10. **Day 2** — user returns to the site (different page). Agent observes via DOM. Multi-signal proactive scoring fires: memory match (high) + workflow continuity (active) + time-since (within window) + DOM-state relevance (high) crosses the trigger threshold. Attention-budget cap permits. Agent pops up: *"Want to pick up where you left off? I found 3 TVs that match what you were looking for."*

**Bonus beats** (demoed on the same scenario):
- **Tier/quota:** end-user is on free tier (host-configured: 50 requests/day). After ~40 interactions, agent surfaces a `RequestsRemainingBadge` composed UI element.
- **Eval dashboard:** host's quality team views the bundled SPA dashboard — per-skill / per-sub-agent / per-feature eval metrics auto-generated from registry metadata, latency distributions, sample interaction drill-down.
- **Domain-dev experience:** a domain dev edits `find-similar-product.feature.md` (hint: prefer the recommendation Sub-Agent earlier in the workflow), saves; hot-reload picks it up; next conversation reflects the change. Time from edit to live: under 5 minutes (NFR-DX-001).
- **Mobile:** the same agent runs in the host's iOS and Android apps via WebView bridge with mobile-context-aware composition (denser layouts, larger touch targets, bottom-sheet vs. side-panel render).

## Scope-in (MVP delivers)

### Substrate
- Web Component shell with **side-panel render mode** (full-page added if time; drawer + ejectable popout deferred to v1) ([ADR-004](../../decisions/decision-log.md))
- WC-wrap default + native-renderer escape hatch ([ADR-010](../../decisions/decision-log.md))
- Multi-framework registry: **React + vanilla WC at MVP** ([ADR-015](../../decisions/decision-log.md))
- Mobile: **WebView bridge with mobile-context-aware composition** ([ADR-017](../../decisions/decision-log.md))

### Registries
- Skills, Sub-Agents (federated), Tools, Atomic UI Components, Theme tokens (DTCG), Features/Services (`.feature.md`), Adapters

### Runtime
- Claude Agent SDK substrate behind thin internal interface ([ADR-007](../../decisions/decision-log.md))
- Bespoke orchestrator + planner (Sonnet) + composer (Haiku + cached templates) + thinker
- Three-tier capability invocation: Tools / Skills / Sub-Agents ([ADR-021](../../decisions/decision-log.md))

### Memory (MVP subset per [memory.md](../../architecture/memory.md))
- **Postgres:** raw interaction log (∞ retention), workflow state, customer interaction profile (basic), SaaS service usage profile (basic), active feedback, tier/quota definitions + tracking
- **Qdrant:** semantic recall (interactions, profiles, summaries)
- **Redpanda:** stream backbone for derivation pipeline ([ADR-014](../../decisions/decision-log.md))
- **Embedding model:** bundled `nomic-embed-text-v1.5` for dev/demo; host-supplied adapter for production ([ADR-024](../../decisions/decision-log.md))

### Multimodal observation
- DOM: MutationObserver + IntersectionObserver + custom semantic events from host (via Adapters registry) ([ADR-022](../../decisions/decision-log.md))
- Microphone listening (basic VAD + transcription)
- Narration via TTS
- Element highlight + programmatic click on host page

### Proactive engine
- Multi-signal scoring confidence (planner conf + memory match + workflow continuity + DOM relevance + time-since) ([ADR-018](../../decisions/decision-log.md))
- Hard-cap attention budget — defaults: max 2/session, max 5/day (host-configurable)

### End-user tier/quota ([ADR-019](../../decisions/decision-log.md))
- Configurable per-tier limits (host defines tiers)
- Per-user request/token tracking in Postgres at MVP (ClickHouse at v1)
- Visible "X requests remaining" composed UI element

### Sub-Agent SDK package
- TypeScript + Python SDKs ([ADR-027](../../decisions/decision-log.md))
- Boilerplate templates per language (`agentsaas init sub-agent`)
- HTTP REST (admin) + gRPC bidirectional streaming (runtime) federation protocol ([ADR-028](../../decisions/decision-log.md))
- Push self-registration + heartbeat + mTLS (intranet) ([ADR-029](../../decisions/decision-log.md))

### Eval ([ADR-023](../../decisions/decision-log.md), [ADR-030](../../decisions/decision-log.md))
- Hybrid scoring: heuristics (every interaction) + LLM-judge sampled (~5%)
- **Auto-generated per-skill / per-sub-agent eval** from registry metadata
- Bundled backend (storage on Postgres at MVP, scoring runners, regression detection)
- Bundled SPA dashboard (React + chart lib, embedded in admin UI)

### Distribution ([ADR-026](../../decisions/decision-log.md))
- Docker Compose for dev/demo
- Helm chart for prod

### Open-source release ([ADR-020](../../decisions/decision-log.md))
- OSS substrate published under permissive license (Apache 2.0 — TBD final)
- Tier 0 (free) covers everything in this scope-in list

### E-commerce demo deliverables
- One Atomic UI Component registry with e-commerce primitives (ProductTile, Cart, FilterBar, ComparisonGrid, RecommendationCarousel, RequestsRemainingBadge, BasicChatBubble, BasicForm)
- One Theme registered (e.g., a Walmart-/Shopify-archetype palette + typography)
- One Feature/Service doc (`find-similar-product.feature.md`)
- One Python recommendation Sub-Agent (federated)
- One in-process Skill (`price-comparison`)
- One Tool (host product-catalog API mock)
- 2-day session demo proving proactive re-engagement

## Scope-out (deferred to v1)

| Capability | Deferred why | Target phase |
|---|---|---|
| ClickHouse + Neo4j stack | MVP proves substrate; analytics + graph layers add at v1 | v1 |
| Time-tiered summaries (session/day/week/month/year) | Requires ClickHouse | v1 |
| Problem-Solution Graph | Requires Neo4j | v1 |
| Customer Churn ML Model + closed-loop VoC reprocessing | High-novelty feature; paywalled per ADR-020; requires v1 stack | v1 (paid tier) |
| VoC outbound: Slack/email digest, webhooks, auto-PR | Embedded dashboard only at MVP | v1 (paid tier) |
| Federated cross-enterprise learning | v2 capability | v2 (paid tier) |
| Native mobile SDKs (iOS Swift / Android Kotlin) | WebView bridge sufficient for MVP demo | v1.5 |
| Vue / Svelte / Angular registry support | React + WC sufficient for e-commerce MVP | v1.5 |
| Learned proactive trigger model | Multi-signal heuristic at MVP; needs MVP feedback data first | v1 |
| Per-user attention-budget adaptation | Hard-cap only at MVP | v1 |
| Embedded eval models | Heuristic + LLM-judge only at MVP | v1 |
| WASM skill isolation | Process isolation only at MVP | v1 |
| SaaS domain profile derivation | Basic interaction + service-usage profiles only at MVP | v1 |
| Adapter library for production-grade hosts | Webhook + simple integration only at MVP | v1 |
| Drawer + ejectable popout shell render modes | Side-panel only at MVP | v1 |
| Eval exporters (Grafana / Datadog / Honeycomb) | Bundled SPA only at MVP | v1 |
| Standalone-binary distribution | Compose + Helm only at MVP | v1.5 |
| Go SDK | TS + Python only at MVP | v1 |

## Anti-scope (the platform will NOT do)

- **Multi-tenant cloud** — self-hosted only ([ADR-006](../../decisions/decision-log.md)), no platform-side cloud holds enterprise data, ever.
- **Generated raw HTML/CSS UI** — composition only from host-registered atomic primitives ([ADR-005](../../decisions/decision-log.md)); off-brand UI is impossible by construction.
- **Cross-enterprise data sharing** — never default-on; only opt-in federated mode at v2.
- **Bypassing host SSO** — bring-your-own auth only.
- **Compiling Feature/Service docs** — super-skill-doc model ([ADR-013](../../decisions/decision-log.md)); no compiler subsystem.
- **Writing host-specific business logic in the platform** — all vertical knowledge lives in the host's registries.
- **Operating any infrastructure on behalf of the enterprise** — we ship software; they run it.

## Acceptance criteria (Done when…)

- ✅ Substrate runs end-to-end against a built mock e-commerce demo site.
- ✅ The 10-beat demo script executes reliably — repeatable, not flaky.
- ✅ A Python Sub-Agent federates over gRPC, push-registers, mTLS handshakes successfully.
- ✅ A domain dev can author a new `.feature.md` and see it live in under 5 minutes (NFR-DX-001).
- ✅ The bundled eval dashboard surfaces auto-generated per-capability metrics for at least the Skills + Sub-Agent + Feature/Service in the demo.
- ✅ The Helm chart installs cleanly on a fresh k8s cluster (kind / minikube / production-like) in under 30 minutes from zero.
- ✅ The Docker Compose stack `up`s on a developer laptop in under 10 minutes from zero.
- ✅ The mobile WebView demo runs on Android + iOS, with mobile-context-aware composition visibly different from desktop.
- ✅ End-user tier/quota: visible "X requests remaining" element renders, host-configured tier limits enforced.
- ✅ All ADR-cited features (or v1 deferrals) are unambiguously implemented or explicitly stubbed-with-rationale.
- ✅ OSS substrate is published, licensed, with a getting-started guide that takes a new contributor from `git clone` to running demo in under 60 minutes.

## Phasing (rough sequencing — INIT-003 will refine into epics + stories)

| Phase | Focus | Approx duration |
|---|---|---|
| **0 — Foundation** | Runtime skeleton, all 7 registries (schema only), Postgres + Qdrant + Redpanda deployment, Claude Agent SDK substrate wiring | weeks |
| **1 — Composition** | WC shell (side-panel), atomic registry, theme tokens (DTCG + SD importer), composer (Haiku + cached templates), bidirectional typed-JSON instruction loop | weeks |
| **2 — Planning** | Planner (Sonnet), three-tier capability invocation, basic Skills + Tools execution, memory recall integration, super-skill-doc consumption from `.feature.md` | weeks |
| **3 — Sub-Agent federation** | SDK (TS + Python), boilerplate templates, federation protocol (HTTP + gRPC), push registration + mTLS, registry integration | weeks |
| **4 — Multimodal + proactive** | DOM observation (MO/IO/custom), mic/TTS, element highlight/click, multi-signal proactive scoring, hard-cap attention budget | weeks |
| **5 — Eval** | Bundled backend (Postgres-storage at MVP), heuristic + LLM-judge sampled scoring, auto-generated per-capability eval from registry metadata, bundled SPA dashboard | weeks |
| **6 — Tier/quota** | Per-user tracking, tier definitions, configurable enforcement, visible "X remaining" composed element | week |
| **7 — E-commerce demo** | Atomic primitives, theme, Feature/Service doc, Python recommendation Sub-Agent, in-process Skill, Tool mock, 2-day session demo polish | weeks |
| **8 — Mobile** | WebView bridge, mobile-context-aware composer, Android + iOS native shim, mobile demo polish | weeks |
| **9 — Distribution + release** | Docker Compose stack, Helm chart, getting-started guide, OSS publication, demo script polish, NFR validation | weeks |

Phases 1–6 can have meaningful internal parallelism; phases 7–9 are mostly serial after substrate is stable.

## Dependencies

- INIT-001 (vision/requirements baseline) — substantially complete; Batch 6 (cross-store consistency, federated learning v2, real-time transport, Adapters transport) is non-blocking and can be groomed in parallel.

## Open dependencies (Batch 6 — won't block MVP start, may shape MVP details)

- **Q6.3 Real-time transport** for WC shell ↔ runtime (WebSocket / SSE / WebRTC) — affects the streaming UX. Sensible MVP default: SSE for streaming planner output to the shell + WebSocket for bidirectional interaction emit. Worth confirming.
- **Q6.4 Adapters registry transport** for host event bus → platform Redpanda — MVP can ship with simple webhook adapter; production-grade SDK adapter library at v1.
- Q6.1 Cross-store consistency, Q6.2 Federated learning — pure post-MVP concerns.

## Child epics

After this scope is accepted, INIT-003 (Build MVP) breaks each phase above into epics + stories + tasks, owned by the work-management skill.
