# ADR-007: Polyglot memory — Postgres + Qdrant + ClickHouse + Kafka + Neo4j

**Status:** accepted
**Decision date:** 2026-04-22

## Context

The agent has four distinct data needs that no single store handles well:

1. **Conversation log** — durable, queryable by sessionId, recent-N reads.
   Postgres-shaped.
2. **Semantic recall** — find earlier turns related to the current intent
   beyond the recent window. Vector-search-shaped (Qdrant).
3. **Eval signal analytics** — high-volume time-series rollups for cohort
   analysis + RLHF feedback. Columnar-shaped (ClickHouse).
4. **Cross-runtime event distribution** — fan-out plan events, layout
   broadcasts, eval signals to downstream services. Kafka-shaped.
5. **Relationship graphs** — customer ↔ session ↔ feature graph queries.
   Neo4j-shaped.

A single-store-fits-all approach (e.g. shoving everything into Postgres)
buckles under one or more of these.

## Decision

**Five backing stores, each behind a pluggable interface.**

| Concern | Default | Production |
|---|---|---|
| Conversation log | KeyValueMemoryProvider (in-process) | PostgresMemoryProvider |
| Semantic recall | (none in MVP) | QdrantMemoryProvider |
| Eval analytics | KeyValueEvalProvider (in-process) | ClickHouseEvalProvider |
| Event bus | InMemoryEventStream | KafkaEventStream |
| Relationship graph | InMemoryGraphProvider | Neo4jGraphProvider |

Each provider accepts a minimal client-shape (e.g. `{ query(sql, params) →
{rows} }` for Postgres / ClickHouse) so the runtime package isn't hard-bound
to a specific driver. Hosts wire `pg.Pool` / `kafkajs.Producer` / etc at
construction.

`ChainedMemoryProvider` composes multiple providers — e.g. KeyValue +
Postgres for fast-path-with-durable-fallback, or KeyValue + Qdrant + Postgres
for full coverage.

## Consequences

**Pro:**
- Each store is best-in-class for its concern.
- The runtime package itself stays lightweight — no required native deps.
- Tenants can run zero, some, or all of these depending on scale needs.

**Con:**
- Five containers to operate in production. Mitigated by `docker-compose.yml`
  shipping with sane defaults.
- Cross-store consistency is the host's concern. We document the pattern
  (write to Postgres synchronously, fan out to Qdrant / ClickHouse / Neo4j
  asynchronously via Kafka).

## Implementation

- `packages/runtime/src/memory/`  — Postgres, Qdrant, KeyValue, DurableFile,
  Chained.
- `packages/runtime/src/eval/`    — KeyValue + ClickHouse.
- `packages/runtime/src/events/`  — InMemory + Kafka.
- `packages/runtime/src/graph/`   — InMemory + Neo4j.
