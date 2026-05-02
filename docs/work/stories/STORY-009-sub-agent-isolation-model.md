# STORY-009 — Define sub-agent federated runtime model

- **Status:** done
- **Created:** 2026-05-01
- **Last updated:** 2026-05-01
- **Parent epic:** [EPIC-002 — Close Batch 4 grooming decisions](../epics/EPIC-002-batch-4-grooming.md)

## User story
As a platform architect, I need to decide the execution and isolation model for sub-agents so that domain teams know how to build and federate their agents into the platform.

## Context
Q4.3 from the 2026-05-01 grooming session. Decision: **major reframe** — sub-agents are NOT in-process isolated workers but **separate federated runtimes** built by domain teams using the AgentSaaS SDK + boilerplate. They register via a Sub-Agent Registry and interact through SDK-defined protocols. Three-tier capability model crystallized: Tools / Skills / Sub-Agents. Captured as ADR-021 (high-novelty).

## Done when
- Decision recorded in `docs/decisions/decision-log.md` as a new ADR. ✅ ADR-021
- INIT-001 Q4.3 marked resolved. ✅
