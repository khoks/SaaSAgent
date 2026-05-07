# EPIC-003 — Multimodal shell and storage providers (Bucket A + B)

- **Status:** done
- **Created:** 2026-05-07
- **Last updated:** 2026-05-07
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Bucket A: mobile-context detection, shell render modes (full-page/drawer/eject), DOM observation (MutationObserver + IntersectionObserver + custom semantic events), Sub-Agent SDK (`@saasagent/sdk`), CLI (`agentsaas`), and demo vertical scaffolding (e-commerce + travel).
Bucket B: Qdrant, ClickHouse, Kafka/Redpanda, and Neo4j storage providers.

## Why
Covers INIT-003 Phase 5 (Multimodal + proactive), Phase 3 (Sub-Agent SDK), Phase 8 (demo verticals scaffold), and Phase 4 storage layer. Built ahead of the original phase ordering to close the most impactful capability gaps.

## Done when (met)
- Mobile-context envelope (deviceClass / viewportWidth / inputMode / networkClass) sent on connect + resize. ✓
- Three render modes implemented + 8 tests. ✓
- DOM observation: `dom-mutation`, `dom-visibility`, `dom-semantic` envelopes flowing end-to-end. ✓
- Sub-Agent SDK package with 5 tests. ✓
- CLI package with 11 tests. ✓
- Demo apps: `apps/demo-ecommerce` + `apps/demo-travel` scaffolded. ✓
- Qdrant (10 tests), ClickHouse (9 tests), Kafka (14 tests), Neo4j (16 tests) providers. ✓
- 468 tests across 8 packages passing at commit `c46a366`. ✓
- Live e2e verified in Chrome: dom-mutation + mobile-context + dom-semantic `cart-item-added`. ✓

## Child stories
_(none — implemented directly from phase plan in INIT-003)_
