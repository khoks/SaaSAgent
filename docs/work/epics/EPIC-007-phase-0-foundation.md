# EPIC-007 — Phase 0 Foundation

- **Status:** done
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Completed:** 2026-05-03
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Phase 0 gate passed: `pnpm install && pnpm build && pnpm test` fully green on fresh clone. pnpm + Turborepo monorepo established with four package skeletons (runtime, sdk-ts, web-shell, cli), plus ADR-032–037 capturing the monorepo and build-tooling decisions, and MVP scope acceptance (INIT-002 accepted by Rahul).

## Why
Phase 0 is the prerequisite for all subsequent build phases. Without a working monorepo skeleton with a passing build + test gate, parallel development on Phase 1+ is blocked.

## What was completed
- pnpm workspaces + Turborepo monorepo at root
- `packages/runtime` (`@saasagent/runtime`) — TypeScript skeleton, Claude Agent SDK stub
- `packages/sdk-ts` (`@saasagent/sdk`) — TypeScript SDK skeleton with placeholder federation interfaces
- `packages/web-shell` (`@saasagent/web-shell`) — `<saas-agent />` custom element skeleton
- `packages/cli` (`@saasagent/cli`) — `agentsaas` binary (help / version / init / dev / registry stubs)
- Build: Turborepo pipeline, `tsc --noEmit`, 4/4 packages green
- Test: Vitest (--passWithNoTests for empty packages), 4 passed + 4 no-test-pass
- CI: GitHub Actions workflow (install + build + lint + test)
- ADR-032–037 committed (polyglot-from-day-1 memory, full monorepo toolchain rationale)
- Two Phase 0 bugs fixed: vitest exit-1 on empty packages (`--passWithNoTests`); Windows path encoding in runtime auto-exec check

## Done when
- `pnpm install && pnpm build && pnpm test` succeeds on fresh clone. ✅
- Four package skeletons present with correct entry-points and tsconfig. ✅
- CI workflow green. ✅
- ADR-032–037 committed. ✅

## Child stories
- [STORY-023 — Phase 0 monorepo scaffold validated](../stories/STORY-023-phase-0-monorepo-validated.md)
