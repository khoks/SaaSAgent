---
id: STORY-032
title: pnpm demo — one-command demo launcher
status: done
epic: EPIC-015
created: 2026-05-13
last-updated: 2026-05-13
---

# STORY-032 — `pnpm demo` one-command demo launcher

- **Status:** done (2026-05-13)
- **Created:** 2026-05-13
- **Last updated:** 2026-05-13
- **Parent epic:** [EPIC-015 — Phase 9: Mobile + distribution + IP gate + OSS publication](../epics/EPIC-015-phase9-mobile-distribution-ip.md)

## User story

As a developer evaluating SaaSAgent, I want a single command that boots all services, opens the demo in Chrome, and tears everything down when I quit — so I can go from clone to running demo in under 60 minutes without manual orchestration.

## What was built (PR #45, merged 2026-05-13)

| Artifact | Detail |
|---|---|
| `scripts/start-demo.mjs` | Node launcher: pre-flight (port checks), pnpm build, parallel boot of runtime (:8080) + sub-agent (:8082) + Vite dev server (:5175), health polling with timeout, Chrome open via `open`, graceful teardown via SIGINT / child-exit cascade |
| `package.json` root | Added `"demo": "node scripts/start-demo.mjs"` script |
| `docs/README.md` | Updated quickstart to point at `pnpm demo` as the single entry point |

**ADR:** ADR-044. Launcher exits clean with 0 on Ctrl-C; all child processes killed via kill-tree before exit. DEP0190 `shell:true` deprecation fixed.

## Acceptance criteria

- [x] `pnpm demo` starts runtime, sub-agent, Vite dev server in sequence.
- [x] Chrome opens automatically once all three services are healthy.
- [x] Ctrl-C kills all child processes and exits cleanly.
- [x] Works in stub mode (no `ANTHROPIC_API_KEY`) for UI / data-plane smoke testing.

## Done
✅ 2026-05-13 — PR #45 merged to main. All acceptance criteria verified live.
