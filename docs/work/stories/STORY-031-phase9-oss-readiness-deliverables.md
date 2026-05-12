---
id: STORY-031
title: Phase 9 OSS-readiness deliverables
status: done
epic: EPIC-015
created: 2026-05-12
last-updated: 2026-05-12
---

# STORY-031 — Phase 9 OSS-readiness deliverables

- **Status:** done
- **Completed:** 2026-05-12
- **Created:** 2026-05-12
- **Last updated:** 2026-05-12
- **Parent epic:** [EPIC-015 — Phase 9: Mobile + distribution + IP gate + OSS publication](../epics/EPIC-015-phase9-mobile-distribution-ip.md)
- **PR:** khoks/SaaSAgent#40 (merged 2026-05-12)
- **ADR:** ADR-039

## User story
As the project owner, I want all in-repo OSS-readiness artifacts committed so that once the off-repo prerequisite (provisional patent filings) is cleared, the repository can be flipped public immediately.

## What was built

| Artifact | Purpose |
|---|---|
| `LICENSE` | Apache 2.0 full license text at repo root |
| `NOTICE` | Attribution + patent notice per Apache 2.0 §4(d) |
| `docs/getting-started.md` | Step-by-step guide: < 60 min from clone to running Expedia demo |
| `docs/nfr.md` | NFR validation: p50 < 400 ms, p99 < 2 s, 500 concurrent users, Helm-deploy ops |
| `docs/oss-publish-gate.md` | 8-item OSS publish checklist; Bucket-A patent filings as hard gate item |
| `docs/architecture/adr/039-oss-publish-gate.md` | ADR-039 — decision to require patent filings before public push |

## Acceptance criteria
- [x] `LICENSE` (Apache 2.0) present at repo root
- [x] `NOTICE` present at repo root
- [x] `docs/getting-started.md` covers clone → demo in < 60 min
- [x] `docs/nfr.md` documents NFR targets
- [x] OSS publish-gate checklist present with hard prerequisites enumerated
- [x] ADR-039 committed

## Remaining blockers (not in scope for this story)
- Provisional patent filings for Bucket A entries (P-001, P-004) — off-repo action; see STORY-013.
- Repo flip to public — blocked on patent filings.
- OSS announcement (blog / LinkedIn / HN) — blocked on public flip.
