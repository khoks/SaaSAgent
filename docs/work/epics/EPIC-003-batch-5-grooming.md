# EPIC-003 — Close Batch 5 grooming decisions

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent initiative:** [INIT-001 — Groom platform vision and requirements](../initiatives/INIT-001-groom-vision-and-requirements.md)

## Outcome
Six operational and implementation decisions answered (Q5.1–Q5.6), each yielding one ADR (ADR-026–031), completing Batch 5 grooming. Decisions: Docker Compose + Helm packaging, TS + Python SDK, HTTP REST + gRPC streaming federation protocol, push self-registration + mTLS authn, bundled SPA eval dashboard, LightGBM + pluggable adapter churn model.

## Why
Batch 5 questions were posed and answered in the 2026-05-01 session. They gated distribution/packaging, sub-agent SDK languages and federation protocol, discovery/authn, eval dashboard, and churn ML architecture. All six were answered and captured as ADR-026–031. Questions on cross-store consistency, federated learning, real-time transport, and adapters transport were deferred to Batch 6 (EPIC-004).

## Done when
- All six Q5.x grooming questions have recorded answers. ✅
- Corresponding ADRs committed to `docs/decisions/decision-log.md`. ✅
- INIT-001 Batch 5 section marked closed. ✅

## Child stories
- [STORY-008 — Define distribution and packaging strategy](../stories/STORY-008-distribution-packaging-strategy.md)
- [STORY-014 — Define customer churn ML model architecture](../stories/STORY-014-churn-ml-model-architecture.md)
- [STORY-017 — Choose sub-agent SDK languages at MVP](../stories/STORY-017-sub-agent-sdk-languages.md)
- [STORY-018 — Define sub-agent federation protocol](../stories/STORY-018-sub-agent-federation-protocol.md)
- [STORY-019 — Define sub-agent discovery and authn/authz](../stories/STORY-019-sub-agent-discovery-authn.md)
- [STORY-020 — Choose eval dashboard tech](../stories/STORY-020-eval-dashboard-tech.md)
