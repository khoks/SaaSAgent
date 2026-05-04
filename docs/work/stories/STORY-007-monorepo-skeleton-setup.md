# STORY-007 — Monorepo skeleton and package setup

- **Status:** done
- **Created:** 2026-05-04
- **Last updated:** 2026-05-04
- **Completed:** 2026-05-04
- **Parent epic:** [EPIC-002 — Phase 0 Foundation](../epics/EPIC-002-phase-0-foundation.md)

## User story

As a developer cloning the repo, I can run `pnpm install && pnpm build && pnpm test` and have all five packages build and test cleanly so that the foundation is validated before feature work begins.

## Done when

- pnpm workspaces + Turborepo configured at root.
- Five packages present: `@saasagent/runtime`, `@saasagent/sdk`, `@saasagent/web-shell`, `@saasagent/cli`, `@saasagent/protocol`.
- `pnpm build` passes 4/4; `pnpm test` passes 8 suites; runtime + CLI smoke green.
- Vitest `--passWithNoTests` fix applied so test-less packages pass cleanly.
- Windows `import.meta.url` ESM auto-exec guard applied.

## Completion notes

Completed in session b2da6a2e (2026-05-04). Committed as multiple commits through Phase 0 gate validation. No open follow-ups.
