# STORY-007 — Decide platform-vendor pricing model

- **Status:** backlog
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform product owner, I need to decide how the SaaS Agent platform charges host enterprises (the vendor-to-host relationship) so that the go-to-market and monetization model is clear before MVP.

## Context
Q4.1 from the 2026-04-28 grooming session. Options posed:
- **Per-seat license** (annual, by # end-users) — predictable; familiar; caps growth
- **Per-conversation** — tracks usage; counter to "agent everywhere" pitch
- **Capacity tier** (small/med/large by MAU + features) — predictable + scales; pricing complexity
- **Open-core hybrid** — free OSS substrate + paid enterprise tier (closed-loop VoC, churn model, federated learning, SLA, multi-region); adoption-driven

Recommended approach: open-core hybrid with capacity-tier pricing on paid tier, anchored on MAU.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q4.1 marked resolved.
