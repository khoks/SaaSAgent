# EPIC-002 — Phase 0 Foundation skeleton

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-07
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Working monorepo scaffold with pnpm workspaces + Turborepo, five package skeletons (protocol, runtime, sdk-ts, web-shell, cli), Docker Compose full polyglot stack, and a green CI gate (`pnpm install && pnpm build && pnpm test`).

## Why
Nothing else can build without a working monorepo + test baseline. Phase 0 is the prerequisite for all subsequent phases.

## Done when (all satisfied)
- ✅ pnpm install succeeds across all workspaces
- ✅ pnpm build (Turborepo) compiles 4/4 packages cleanly
- ✅ pnpm test passes (8 tests + passWithNoTests)
- ✅ Runtime smoke: runtime process prints start message
- ✅ CLI smoke: `agentsaas --help` and `--version` respond

## Commits
- `c9110fc` — initial monorepo scaffold + ADRs 032-037 + MVP scope accepted
- `80da183` — fix: vitest `--passWithNoTests`; cross-platform main detection

## Notes
Phase 0 gate satisfied 2026-05-07. Docker Compose includes Postgres, Qdrant, Redpanda, ClickHouse, Neo4j per ADR-032.
