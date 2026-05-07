# STORY-020 — Bearer auth + token-bucket rate limiting (Phase 2.7)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-010 — Phase 2 — Planning & Execution](../epics/EPIC-010-phase-2-planning-execution.md)

## What
Security hardening and rate-limiting for the MVP-of-MVP gate (Phase 2.7):
- **Bearer auth middleware** — `Authorization: Bearer <token>` validation on all REST + WS endpoints; configurable via `SAAS_AGENT_API_KEY` env var; 401 on missing/invalid token.
- **Token-bucket rate limiter** — per-IP sliding window; configurable `requestsPerMinute`; 429 + `Retry-After` header on breach.
- **Docker Compose hardened** — `docker-compose.yml` updated with all services (Postgres, Qdrant, Redpanda, ClickHouse, Neo4j), healthchecks, dev + test profiles, and env var injection for the runtime service.
- Tests: auth middleware (valid/missing/wrong token), rate limiter (under limit, at limit, over limit, per-IP isolation).

## Done when
- All runtime endpoints reject unauthenticated requests.
- Rate limiter enforces per-IP cap; returns 429 with proper headers.
- `docker-compose up` brings the full local stack up cleanly.
- 384 tests passing across 4 packages (MVP-of-MVP gate).

## Result
Done. Commit `fb17407`. Bearer auth + token-bucket rate limiting + hardened Docker Compose — Phase 2 MVP-of-MVP gate complete. 384 tests @ commit.
