# Memory Architecture

> Per [ADR-008](../decisions/decision-log.md). Polyglot persistence, phased rollout (MVP → v1 → v2). All stores live inside the enterprise's data plane per [ADR-006](../decisions/decision-log.md). "Cross-customer" throughout means **intra-tenant** (across the enterprise's own end-user base) — never cross-enterprise.

## Stores

| # | Store | Tech | Purpose | Phase |
|---|---|---|---|---|
| 1 | **Raw interactions log** | Postgres (append-only) | Forever-immutable source of truth: every turn, every composed artifact, every emit | MVP |
| 2 | **Workflow state** | Postgres | Per-user workflow progress + status (`active` / `completed` / `abandoned` / `superseded`) + resumability | MVP |
| 3 | **Customer interaction profile** | Postgres (derived) | Personalization + empathy: communication style, expertise level, frustration triggers, success patterns | MVP |
| 4 | **SaaS service usage profile** | Postgres (derived) | Features used, depth, frequency, sequences (within the host's product) | MVP |
| 5 | **Active feedback** | Postgres | Explicit user signals: thumbs, ratings, written comments | MVP |
| 6 | **Semantic recall** | Qdrant | Vector embeddings of interactions, summaries, profiles, problem-solution entries | MVP |
| 7 | **SaaS domain profile** | Postgres (derived) | Domain-specific persona traits (e-commerce: deal-hunter / brand-loyalist / gift-buyer; etc.) | v1 |
| 8 | **Time-tiered summaries** | ClickHouse | Per-session / day / week / month / year roll-ups; agent-queryable per tier | v1 |
| 9 | **Problem-Solution Graph** | Neo4j | Intra-tenant KB: canonical (problem, solution, context, outcome) tuples, semantically deduped, graph-organized | v1 |
| 10 | **Eval datapoints** | ClickHouse | Live per-interaction + offline per-session eval; trend analysis; regression detection | v1 |
| 11 | **Agent self-telemetry** | ClickHouse | Usage stats about the agent platform itself: turns, composition cycles, tool invocations, latency, model spend | v1 |
| 12 | **Deduced feedback** | Postgres + ClickHouse | Inferred signals: acceptance, abandonment, retry, revisit, deepening | v1 |
| 13 | **Voice-of-Customer aggregation** | ClickHouse + Neo4j | Pain points + capability requests + prioritization signals; **also reprocessed back into agent decision-making** (see closed-loop architecture below) | v1 |
| 14 | **Customer Churn ML Model state** | Postgres + Neo4j (similar-customer lookups) | Per-tenant model that predicts P(churn \| customer, feature); consumed by planner at recommendation time per [ADR-016](../decisions/decision-log.md) | v1 |
| 15 | **End-user tier/quota tracking** | Postgres (tier definitions) + ClickHouse (usage tallying) | Per-user request/token usage against host-defined tier limits; per [ADR-019](../decisions/decision-log.md) | MVP |
| 16 | **Federated learning state** | TBD | Cross-enterprise opt-in pattern sharing (privacy-preserving) | v2 |

## Continuous derivation pipeline

```
RAW INTERACTION STREAM (every turn, emit, composed artifact)
        │
        ▼
┌──────────────────────────┐
│ Postgres (raw, ∞)        │  ◄── source of truth, append-only
└──────┬───────────────────┘
       │
       ├───► Embedding worker  ───────────► Qdrant         (semantic recall)
       │
       ├───► Profile builder   ───────────► Postgres       (interaction / SaaS-usage / domain profiles)
       │
       ├───► Workflow tracker  ───────────► Postgres       (workflow state)
       │
       ├───► Active feedback collector ──► Postgres        (explicit signals)
       │
       ├───► Deduced feedback inferrer ──► Postgres + CH   (acceptance / abandonment / retry)
       │
       ├───► Summarizer (cron)  ──────────► ClickHouse     (session/day/week/month/year)
       │
       ├───► Problem-Solution extractor ─► Neo4j           (graph: problem ↔ solution ↔ feature ↔ pain ↔ user-type)
       │
       ├───► Eval scorer (live + batch) ─► ClickHouse      (per-interaction + per-session metrics)
       │
       └───► VoC aggregator    ──────────► ClickHouse + Neo4j  (pain points + recs for dev team)
                                                  │
                                  ┌───────────────┼───────────────────────┐
                                  │               │                       │
                                  ▼               ▼                       ▼
                          OUTBOUND surfaces:  REPROCESS into        REPROCESS into
                          - Dashboard         customer interaction  Customer Churn
                          - Webhook (Linear/  profile               ML Model
                            Jira/GH Issues)                                │
                          - Slack/email                                    │   (P(churn | customer,
                          - Auto-PR with                                   │    feature) — consumed
                            suggested issues                               │    by planner at
                                                                          ▼    recommendation time)
                                                                  CLOSED LOOP back to Planner

AGENT QUERY PATH:
  Planner / Composer / Thinker
        │
        ▼
  Memory accessor (router)  ──┬──► Qdrant       (semantic)
                              ├──► Postgres     (structured: profile, workflow, raw, tier/quota)
                              ├──► ClickHouse   (time-tiered summaries, eval, telemetry, VoC, usage tallying)
                              ├──► Neo4j        (problem-solution graph, VoC relations, churn-similar customers)
                              └──► Churn Model  (P(churn | customer, candidate-feature)) ◄── per ADR-016
```

## Closed-loop VoC architecture (per ADR-016)

VoC is **not just an outbound stream**. The full architecture:

```
Agent observes user interactions
        │
        ▼
Active + Deduced feedback (FR-FB)
        │
        ▼
VoC pipeline extracts pain points / capability requests / friction patterns
        │
        ├──► OUTBOUND  (configurable surfaces — defaults: weekly Slack digest + embedded dashboard)
        │     - Dashboard
        │     - Webhook (Linear / Jira / GitHub Issues)
        │     - Slack/email digest
        │     - Auto-PR with suggested issues
        │
        └──► REPROCESS BACK INTO PLATFORM
              ├──► Customer interaction profile updates (FR-MEM-003)
              ├──► Customer Churn ML Model inputs (FR-CHURN)
              │      │
              │      ▼
              │    Predicts P(churn | customer, feature)
              │      │
              │      ▼
              │    Consumed by Planner at recommendation time
              │    → suppresses / down-weights features that have caused friction
              │      for customers similar to the current one
              │
              └──► Product improvement opportunity tracker (Jira / Linear / GitHub via auto-PR)
```

## Phasing rationale

- **MVP** — Postgres + Qdrant only. Two systems. Working end-to-end with raw storage, semantic recall, basic profile, workflow tracking, active feedback. The bare minimum that proves the substrate.
- **v1** — Add ClickHouse + Neo4j. Bring online: time-tiered summaries, problem-solution graph, eval, telemetry, deduced feedback, voice-of-customer.
- **v2** — Federated cross-enterprise learning, opt-in only.

## Pluggable adapters

Every store sits behind an adapter interface. Defaults ship as PG / Qdrant / ClickHouse / Neo4j. Enterprises can swap to existing instances they already operate (Pinecone, Weaviate, Snowflake, BigQuery, etc.) by implementing the adapter contract. Adapters preserve the substrate's portability across enterprise infra preferences.

## Cross-cutting properties

- **Source-of-truth invariant.** All derived stores can be rebuilt from the Postgres raw log. Enables backfill, corruption recovery, schema migration.
- **Causality-tracked.** Every derived datum carries the raw-log offsets that produced it.
- **Eventual consistency.** Across stores, derivations may lag the raw log by seconds (live) to hours (batch summaries).
- **Per-user partitioning.** All stores partition by `(tenant_id, user_id)` at the schema level for isolation, deletion-on-request (GDPR right-to-erasure), and per-user analytics.

## Open questions (Batch 3)

- Stream processing technology — in-process worker pool (MVP-simple) vs. Redpanda (single-binary Kafka-compatible) vs. Kafka (heavy but standard) vs. Temporal (workflow-oriented).
- Eval framework target metrics — groundedness, helpfulness, intent-alignment, latency? Live scoring approach: LLM-as-judge / heuristics / embedded eval models?
- Voice-of-Customer surface for dev team — dashboard / webhook / Slack-or-email digest / auto-PR with suggestions / multi?
- Cross-store consistency failure-recovery semantics.
- Backup / restore strategy for the polyglot stack.
- Schema versioning across the four stores when we evolve.
- Embedding model choice (Anthropic? open-source? host-supplied?).
