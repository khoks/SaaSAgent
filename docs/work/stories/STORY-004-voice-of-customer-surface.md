# STORY-004 — Define voice-of-customer surface for the dev team

- **Status:** done
- **Created:** 2026-04-28
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-001 — Close Batch 3 grooming decisions](../epics/EPIC-001-batch-3-grooming.md)

## User story
As a platform architect, I need to decide how the agent surfaces extracted product insights (pain points, recommendations) to the enterprise dev team so that the VoC pipeline has a concrete delivery mechanism.

## Context
Q6 introduced voice-of-customer extraction as a first-class concern. Options posed: dashboard / webhook / Slack-or-email digest / auto-PR into the product backlog / combination.

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR.
- INIT-001 Q3.4 marked resolved.

## Resolution
ADR-016 recorded: multi-surface VoC (dashboard + Slack digest at MVP) with closed-loop reprocessing back into agent decision-making via Customer Churn ML Model. High-novelty addition. Closed batch 3 session 2026-04-28.
