# STORY-014 — ClickHouse time-series analytics provider

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-015 — Bucket B: Polyglot storage providers sprint](../epics/EPIC-015-bucket-b-polyglot-storage.md)

## User story

As the churn pipeline and eval dashboard, I want a `ClickHouseMemoryProvider` so that high-volume time-series interaction events can be written and queried at analytical scale without saturating the Postgres OLTP store.

## Context

ADR-032 specified ClickHouse as the analytics sink for time-tiered session summaries and per-feature interaction telemetry. The provider implements the MemoryProvider interface using ClickHouse's HTTP interface, consistent with the dependency-free approach used for other providers.

## Done when

- `runtime/src/memory/clickhouse.ts` implements `MemoryProvider` for insert + time-range queries.
- Provider registered and selectable in `ChainedMemoryProvider`.
- Unit tests added and passing.
