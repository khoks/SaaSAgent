# EPIC-003 — Local infrastructure

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

Docker Compose file with full polyglot stack (PG + Qdrant + Redpanda + ClickHouse + Neo4j), healthchecks, dev and test profiles.

## Phase
Phase 0 — Foundation

## Done when
- `pnpm infra:up` brings the full stack up cleanly.
- All services pass healthchecks.

## Notes
Completed as part of Phase 0 gate (2026-05-06). Note: Phase 2.7 hardening extended docker-compose.yml with runtime container and env-var-driven auth config.
