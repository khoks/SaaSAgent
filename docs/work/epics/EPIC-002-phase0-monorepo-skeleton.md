---
id: EPIC-002
title: Phase 0 — Monorepo skeleton
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-06
---

# EPIC-002 — Phase 0: Monorepo skeleton

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

pnpm workspaces + Turborepo monorepo with package layout, base tsconfig, root scripts, and all Phase 0 package skeletons wired.

## Done when
- `pnpm install && pnpm build` succeeds end-to-end on a fresh clone.
- Package layout matches ADR-036 tooling.

## Delivered
Commit `c9110fc` — monorepo scaffold, pnpm workspaces, Turborepo config, base tsconfig, root scripts. Phase 0 gate passed.
