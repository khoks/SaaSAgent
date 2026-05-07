# STORY-013 — Durable + Postgres + Chained memory providers (Phase 2.3.x)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Extended memory tier with durable and chained providers:
- `DurableMemoryProvider` — file-system-backed JSON store, survives process restarts.
- `PostgresMemoryProvider` — persists session memory to Postgres; connects via `DATABASE_URL` env.
- `ChainedMemoryProvider` — composes multiple providers (e.g., KV → Postgres fallback) with a first-write-wins policy.
- Docker Compose updated to include Postgres service; `pnpm infra:up` brings PG up.

## Done when
- Memory survives a runtime restart (DurableMemoryProvider).
- Memory is persisted to Postgres when `DATABASE_URL` is set.
- Providers can be chained; reads fall through, writes fan out.

## Result
Done. Commit `5b0c2e7`. Durable + Postgres + chained memory providers operational.
