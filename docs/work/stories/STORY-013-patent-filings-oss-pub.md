---
id: STORY-013
title: Provisional patent filings + OSS publication
status: in-progress
epic: EPIC-015
created: 2026-05-06
last-updated: 2026-05-12
---

# STORY-013 — Provisional patent filings + OSS publication

- **Status:** in-progress
- **Created:** 2026-05-06
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-015 — Phase 9: Mobile + distribution + IP gate](../epics/EPIC-015-phase9-mobile-distribution-ip.md)

## User story
As the IP owner, I need provisional patent applications filed for the patentability-strong novel entries before the repo goes public so that IP is protected prior to Apache 2.0 OSS publication.

## Context
ADR-035 gates OSS publication on patent filings. 5 patentability-strong novel-idea entries identified in `docs/novel-ideas/ideas.md`. This is a hard prerequisite before flipping the repo to public.

## Progress (2026-05-12)
- ✅ Apache 2.0 `LICENSE` + `NOTICE` added to repo root (PR #40).
- ✅ OSS publish-gate checklist with 8-item gate; Bucket-A patent filings are the hard gate item (ADR-039).
- ❌ Provisional patent applications — require engaging outside patent counsel; drafting and filing are real-world actions outside this repo.
- ❌ Repo flipped to public — blocked on patent filings.
- ❌ OSS announcement — blocked on public flip.

## Done when
- Provisional patent applications filed (or attorney engaged + applications drafted and in-queue) for all patentability-strong novel entries in ADR-035. ❌ pending.
- Apache 2.0 `LICENSE` file added to repo root. ✅
- Repo flipped to public on GitHub. ❌ pending.
- OSS announcement published (blog post / LinkedIn / HN as appropriate). ❌ pending.
- INIT-002 acceptance criterion satisfied: "Provisional patent filings completed for patentability-strong novel-idea entries — gates OSS publication."
- INIT-003 "Done when" criteria satisfied: patents filed + Apache 2.0 OSS publication done.
