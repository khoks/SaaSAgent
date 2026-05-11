---
id: EPIC-004
title: Phase 0 — CI baseline (GitHub Actions)
status: done
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-06
---

# EPIC-004 — Phase 0: CI baseline (GitHub Actions)

- **Status:** done (2026-05-06)
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

GitHub Actions pipeline: install + build + lint + test, running on every push/PR.

## Delivered
Commit `c9110fc` — GitHub Actions workflows for install, build, lint (ESLint + Prettier + ruff + black), test (Vitest + pytest). Phase 0 gate passed.
