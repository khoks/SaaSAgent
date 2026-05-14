---
id: EPIC-015
title: Phase 9 — Mobile + distribution + IP gate + OSS publication
status: in-progress
initiative: INIT-003
created: 2026-05-06
last-updated: 2026-05-13
---

# EPIC-015 — Phase 9: Mobile + distribution + IP gate + OSS publication

- **Status:** in-progress
- **Created:** 2026-05-06
- **Last updated:** 2026-05-13
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome

All INIT-002 acceptance criteria satisfied; provisional patents filed; repo flipped public; Apache 2.0 OSS published.

## Scope (per INIT-003 Phase 9)
- WebView bridge (iOS + Android native shims)
- Mobile-context-aware composer adaptation (mobile demo polished)
- Helm chart hardened for production
- Docker Compose dev/demo polished
- Getting-started guide (`< 60 min from clone to running demo`)
- NFR validation (latency, scale, ops)
- **Provisional patent filings** for high-novelty entries (per ADR-035) — gates OSS publication
- Apache 2.0 license file added; repo flipped to public
- OSS publication announcement

## Progress

PR #40 (2026-05-12) — OSS-readiness deliverables:
- ✅ `LICENSE` (Apache 2.0) + `NOTICE` added to repo root.
- ✅ `docs/getting-started.md` — < 60 min from clone to running demo.
- ✅ `docs/nfr.md` — NFR validation (latency, scale, ops).
- ✅ OSS publish-gate checklist — 8-item gate with Bucket-A patent filings as hard prerequisite.
- ✅ ADR-039 — OSS publish gate decision fixated.

PR #45 (2026-05-13) — one-command demo launcher:
- ✅ `pnpm demo` — boots runtime + sub-agent + Vite, opens Chrome, tears down on Ctrl-C (ADR-044). See STORY-032.

Still pending:
- ❌ Provisional patent filings — require real-world attorney engagement; still pending.
- ❌ WebView bridge (iOS + Android native shims) — deferred.
- ❌ Helm chart hardened — deferred.
- ❌ Repo flipped to public — blocked on patent filings.

## Phase 9 gate
All INIT-002 acceptance criteria satisfied; repo public; patents filed. ⏳ Blocked on: patent filings + public repo flip.

## Child stories
- [STORY-012 — Mobile WebView bridge + context-aware composition](../stories/STORY-012-mobile-webview-bridge.md) — backlog
- [STORY-013 — Provisional patent filings + OSS publication](../stories/STORY-013-patent-filings-oss-pub.md) — in-progress
- [STORY-031 — Phase 9 OSS-readiness deliverables](../stories/STORY-031-phase9-oss-readiness-deliverables.md) — done
- [STORY-032 — `pnpm demo` one-command demo launcher](../stories/STORY-032-pnpm-demo-one-command-launcher.md) — done
