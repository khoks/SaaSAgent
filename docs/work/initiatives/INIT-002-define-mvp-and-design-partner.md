# INIT-002 — Define MVP slice and design-partner vertical

- **Status:** done (scope accepted 2026-05-06; build phase in progress under INIT-003)
- **Created:** 2026-04-26
- **Last updated:** 2026-05-06
- **Outcome:** A written MVP scope that proves the substrate is real for our anchor verticals, grounds the patent filings (ADR-035), and is realistically achievable by a 2-builder team (ADR-036).

## Why

Universal platforms die when they try to be universal on day one. We need an honest MVP cut that proves the substrate is real for our chosen verticals, then expand. The MVP is also the **proof artifact for provisional patent filings** ([ADR-035](../../decisions/decision-log.md)) — the patent applications need a real working system to describe.

## Anchor verticals (per [ADR-033](../../decisions/decision-log.md))

**Dual vertical: e-commerce + travel.** Composite design-partner archetype = **Walmart-/Best-Buy-style e-commerce AND Expedia-/Booking-style travel** (real partner TBD; Rahul to source).

- **E-commerce** stress-tests: the proactive engine, cross-session re-engagement, transactional flows, atomic-DS composition for product surfaces.
- **Travel** stress-tests: multi-step planning depth, comparison/change/cancel workflows, the orchestrator's ability to handle complex sequences.

## Wow target (per [ADR-034](../../decisions/decision-log.md))

**The agent IS the primary interaction surface.** The bar is: a returning user finds it strictly faster, more intuitive, and less limited to accomplish their goal through the agent than through the host's existing UI. The host UI persists as the channel for admin / troubleshooting / legacy support only.

This is a much more ambitious bar than "AI helper bolted onto the host UI." It implies:
- The agent must cover the host's **most common workflows fluently**, not just one demo flow.
- Interaction patterns must **build muscle memory** — predictable, repeatable, rewarding.
- **Not limited** — capable of executing the full surface area of the host's product, not a curated subset.

## Demo script (10 beats per anchor; demonstrates wow target)

### E-commerce flow (Walmart/Best-Buy archetype)
1. Setup: host has installed agent via Helm; theme + atomic primitives + skills + sub-agents + tools + features registered.
2. Returning user arrives. Agent observes via DOM (MO/IO) + custom semantic events (`product.viewed`).
3. User opens agent panel: *"I want to upgrade my TV. Show me 55-inch options under $800 that match what I usually buy."*
4. Planner (Sonnet) recalls user's interaction profile via Qdrant; selects skills + tools; composes plan.
5. UI Composer (Haiku, cached templates) emits typed-JSON layout tree referencing host atomic primitives (ProductTile + ComparisonGrid + FilterBar + ThemeTokens).
6. WC Shell mounts React components, applies theme, injects data, subscribes to interaction events.
7. User refines: *"compare the top two on picture quality and warranty."* → typed JSON emit → planner re-plans → invokes Python recommendation Sub-Agent over gRPC streaming → composer renders deep-comparison artifact.
8. User adds to cart through agent (no host-UI navigation). Workflow `tv-upgrade` registered active.
9. Closed-loop VoC: agent surfaces per-feature pain points to dashboard ("filter UX confusing — 3 users abandoned"); auto-fed into Customer Churn Model (LightGBM); next user with similar profile gets de-emphasized filter UI.
10. Day 2: user returns to host site (any page). Multi-signal proactive scoring fires; agent pops up: *"Last time you were comparing TVs — found 2 new arrivals matching your criteria. Want to see?"*

### Travel flow (Expedia/Booking archetype)
1. Setup similar; travel atomic primitives registered (FlightCard, ItineraryTimeline, DateRangePicker, MultiCityRouteMap, HotelTile).
2. User opens agent: *"Plan a 5-day trip to Tokyo and Kyoto in October — I have flexible dates within that month."*
3. Planner decomposes into multi-step plan: search flights → optimize date window → search hotels per city → compose itinerary.
4. Composer renders progress: a multi-step itinerary skeleton appears, populated as sub-agent results stream in (live composition).
5. Travel-recommendation Sub-Agent (Python, federated via gRPC) streams candidate flights and hotels.
6. Composer composes ItineraryTimeline with FlightCards + HotelTiles + ChangeDates affordances using host atomic primitives.
7. User: *"swap the Tokyo hotel — cheaper near Shinjuku."* → typed JSON emit → planner re-plans just that segment → composer surgically updates the timeline (no full re-render).
8. User books through agent. Workflow `tokyo-kyoto-trip` registered active. Per-user tier/quota: visible "X requests remaining" element shown when threshold crossed.
9. Two days before departure, agent proactively pops up: *"Weather forecast just changed — want to swap the open-air activity for an indoor option?"* (multi-signal trigger: workflow continuity + time + DOM-state + memory match.)
10. Post-trip: user opens agent: *"the Kyoto hotel was great — book it again next time."* → preference recorded in customer interaction profile + similar-customer cluster updated; future trip suggestions weighted accordingly.

### Bonus beats (cross-cutting, both verticals)
- **Tier/quota visibility** ([ADR-019](../../decisions/decision-log.md)): host-configured tiers, visible "X remaining" composed UI surfaced contextually.
- **Eval dashboard** ([ADR-023](../../decisions/decision-log.md), [ADR-030](../../decisions/decision-log.md)): host's quality team views auto-generated per-skill / per-sub-agent metrics, sample drill-downs.
- **Domain-dev hot-reload** (NFR-DX-001): edit `.feature.md`, see live in <5 min.
- **Mobile** ([ADR-017](../../decisions/decision-log.md)): same flows in WebView with mobile-context-aware composition.
- **Closed-loop VoC** ([ADR-016](../../decisions/decision-log.md)): pain points → churn model → planner suppresses friction-causing features for similar customers.

## Scope-in (MVP delivers — full polyglot per [ADR-032](../../decisions/decision-log.md))

### Substrate
- WC shell with side-panel render mode (full-page if time)
- WC-wrap default + native-renderer escape hatch
- Multi-framework registry: React + vanilla WC at MVP
- Mobile WebView bridge with mobile-context-aware composition

### Registries (all 7)
Skills, Sub-Agents (federated), Tools, Atomic UI Components, Theme tokens (DTCG), Features/Services (`.feature.md`), Adapters (events + data adapters)

### Runtime
- Claude Agent SDK substrate behind thin internal interface
- Bespoke orchestrator + planner (Sonnet) + composer (Haiku + cached templates) + thinker
- Three-tier capability invocation: Tools / Skills / Sub-Agents

### Memory — full polyglot from day 1 (per ADR-032)
- **Postgres:** raw log, workflow state, profiles, active feedback, tier definitions
- **Qdrant:** semantic recall (host-supplied embedding adapter; bundled `nomic-embed-text-v1.5` for dev)
- **Redpanda:** stream backbone for derivation pipeline
- **ClickHouse:** time-tiered summaries (session/day/week/month/year), eval datapoints, agent telemetry, VoC analytics, per-user usage tallying
- **Neo4j:** intra-tenant problem-solution graph, churn-similar-customer relations, VoC graph

### Closed-loop VoC + Customer Churn ML Model (NEW MVP per ADR-032)
- VoC pipeline extracts pain points / capability requests / friction patterns
- Outbound: embedded dashboard + Slack digest at MVP (auto-PR + webhooks at v1)
- Reprocessing: customer interaction profile updates + Customer Churn ML Model (LightGBM bundled, pluggable, SHAP explainability) + product-improvement tracker
- Closed loop: planner consumes P(churn | customer, feature) at recommendation time; suppresses high-churn-risk feature surfacing for similar customers

### Multimodal observation
- DOM (MO + IO + custom semantic events from host via Adapters registry)
- Microphone (basic VAD + transcription)
- Narration via TTS
- Element highlight + programmatic click

### Proactive engine
- Multi-signal scoring confidence
- Hard-cap attention budget (defaults: max 2/session, max 5/day; host-configurable)

### End-user tier/quota
- Configurable per-tier limits (host defines tiers)
- Per-user request/token tracking
- Visible "X remaining" composed element

### Sub-Agent SDK package
- TS + Python SDKs
- Boilerplate templates per language
- HTTP REST (admin) + gRPC bidirectional streaming (runtime)
- Push self-registration + heartbeat + mTLS (intranet trust)

### Eval
- Hybrid scoring (heuristics + LLM-judge sampled)
- Auto-generated per-capability eval from registry metadata
- Bundled backend (ClickHouse storage)
- Bundled SPA dashboard (React + chart lib, embedded in admin UI)

### Distribution
- Docker Compose (dev/demo)
- Helm chart (prod)

### Demo deliverables (both verticals)
- Atomic UI Component registries: e-commerce primitives + travel primitives
- 2 themes (one per vertical)
- 2 Feature/Service docs (one per vertical)
- 2 Sub-Agents (e-commerce recommendation, travel planning)
- 2-3 Skills (price-comparison, itinerary-builder, etc.)
- Mock host APIs for both verticals
- 2-day session demo (proactive re-engagement) for each vertical

### License + IP
- License: Apache 2.0
- Repo: stays **private** until provisional patents filed for high-novelty entries (ADR-035)
- Pre-OSS-publish gate at Phase 9

## Scope-out (deferred to v1+)

| Capability | Deferred why | Target |
|---|---|---|
| Auto-PR with suggested issues | Richer VoC outbound; needs host repo integration | v1 (paid tier) |
| Webhook outbound (Linear/Jira/GitHub) | Beyond MVP demo; embedded dashboard + Slack digest sufficient at MVP | v1 (paid tier) |
| Federated cross-enterprise learning | v2 capability | v2 (paid tier) |
| Native mobile SDKs (iOS Swift / Android Kotlin) | WebView bridge sufficient for MVP demo | v1.5 |
| Vue / Svelte / Angular registry support | React + WC sufficient for MVP | v1.5 |
| Learned proactive trigger model | Multi-signal heuristic at MVP; needs MVP feedback data first | v1 |
| Per-user attention-budget adaptation | Hard-cap only at MVP | v1 |
| Embedded eval models | Heuristic + LLM-judge sampled only at MVP | v1 |
| WASM skill isolation | Process isolation only at MVP | v1 |
| SaaS domain profile derivation | Basic interaction + service-usage profiles only at MVP | v1 |
| Adapter library for production-grade hosts | Webhook + simple integration only at MVP | v1 |
| Drawer + ejectable popout shell render modes | Side-panel only at MVP (full-page if time) | v1 |
| Eval exporters (Grafana / Datadog / Honeycomb) | Bundled SPA only at MVP | v1 |
| Standalone-binary distribution | Compose + Helm only at MVP | v1.5 |
| Go SDK | TS + Python only at MVP | v1 |

## Anti-scope (the platform will NEVER do)

- **Multi-tenant cloud** — self-hosted only ([ADR-006](../../decisions/decision-log.md)).
- **Generated raw HTML/CSS UI** — composition only from host primitives ([ADR-005](../../decisions/decision-log.md)).
- **Cross-enterprise data sharing** without explicit opt-in (federated mode at v2 only).
- **Bypassing host SSO** — bring-your-own auth.
- **Compiling Feature/Service docs** — super-skill-doc model ([ADR-013](../../decisions/decision-log.md)).
- **Writing host-specific business logic in the platform** — vertical knowledge lives in registries.
- **Operating any infrastructure on behalf of the enterprise** — we ship software; they run it.

## Acceptance criteria

- ✅ Substrate runs end-to-end against both demo hosts (e-commerce + travel mocks).
- ✅ Both 10-beat demo scripts execute reliably — repeatable, not flaky.
- ✅ A Python Sub-Agent federates over gRPC, push-registers, mTLS handshakes successfully — for both verticals.
- ✅ A domain dev can author a new `.feature.md` and see it live in under 5 minutes.
- ✅ Bundled eval dashboard surfaces auto-generated per-capability metrics.
- ✅ Closed-loop VoC visibly affects feature surfacing on a second similar user.
- ✅ Helm chart installs cleanly on a fresh k8s cluster in under 30 minutes.
- ✅ Docker Compose stack `up`s on a developer laptop in under 10 minutes.
- ✅ Mobile WebView demo runs on Android + iOS, mobile-context-aware composition visibly different from desktop.
- ✅ End-user tier/quota: visible "X remaining" element renders, host-configured tier limits enforced.
- ✅ **User-test gate (Wow validation per ADR-034):** in a structured user-test session, ≥7 of 10 testers complete a target workflow strictly faster through the agent than through the host UI on a second attempt.
- ✅ Provisional patent filings completed for the patentability-strong novel-idea entries ([ADR-035](../../decisions/decision-log.md)) — gates OSS publication.

## Phasing (per [ADR-036](../../decisions/decision-log.md), 2-builder team)

INIT-003 breaks each phase into epics + stories. High-level sequencing:

| Phase | Focus |
|---|---|
| **0 — Foundation** | Monorepo (pnpm + Turborepo), runtime/sdk-ts/web-shell/cli package skeletons, Docker Compose with full stack (PG + Qdrant + Redpanda + ClickHouse + Neo4j), Claude Agent SDK wiring, basic CI |
| **1 — Composition** | WC shell (side-panel), atomic registry, theme tokens (DTCG + SD importer), composer (Haiku + cached templates), bidirectional typed-JSON instruction loop. **MVP-of-MVP gate:** end-to-end composed artifact rendering from a hand-crafted plan |
| **2 — Planning** | Planner (Sonnet), three-tier capability invocation, basic Skills + Tools, super-skill-doc consumption from `.feature.md`, memory recall integration. **MVP-of-MVP gate:** end-to-end conversational turn working |
| **3 — Sub-Agent federation** | TS + Python SDKs, boilerplate, federation protocol (HTTP + gRPC), push registration + mTLS, registry integration |
| **4 — Memory + closed-loop VoC + churn** | Full polyglot derivation pipeline, time-tiered summaries, problem-solution graph, VoC extraction, Customer Churn ML Model (LightGBM + cold-start), closed-loop integration into planner |
| **5 — Multimodal + proactive** | DOM observation, mic/TTS, element highlight/click, multi-signal proactive scoring, hard-cap attention budget |
| **6 — Eval** | Auto-generated per-capability eval, bundled backend, bundled SPA dashboard |
| **7 — Tier/quota** | Per-user tracking, tier definitions, configurable enforcement, visible "X remaining" element |
| **8 — Demo verticals** | E-commerce + travel atomic primitives, themes, Feature/Service docs, Sub-Agents, Skills, mock APIs, 2-day session demos |
| **9 — Mobile + distribution + IP gate** | WebView bridge + mobile-context awareness, Compose + Helm packaging, NFR validation, **provisional patent filings**, OSS publication |

**MVP-of-MVP** = Phases 0+1+2 completed = end-to-end conversational turn with composed UI working. After that, parallel work fans out across phases 3-7. Demo polish (8) and mobile + IP + release (9) are serial tail.

## Open dependencies (Batch 6 — non-blocking; may shape MVP details)

- **Q6.3 Real-time transport** for WC shell ↔ runtime — sensible MVP default: **SSE for streaming planner output + WebSocket for bidirectional emit**. Confirm before Phase 1.
- **Q6.4 Adapters registry transport** — webhook for MVP-simple hosts; SDK adapter library at v1.
- Q6.1 Cross-store consistency, Q6.2 Federated learning — pure post-MVP concerns.

## Child epics

See [INIT-003](INIT-003-build-mvp.md) for the build plan with epics + stories under each phase. Work-management skill maintains.
