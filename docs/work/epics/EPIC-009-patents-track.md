# EPIC-009 — Patents track — IP preparation

- **Status:** in-progress
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Invention disclosures for all patentability-strong novel ideas, a filing strategy, and completed provisional patent filings before OSS publication (per ADR-035).

## Why
ADR-035 mandates that provisional patents be filed for high-novelty entries before the repo goes public (Apache 2.0). The disclosures are the prerequisite artifact for attorney review and formal filing. USPTO requires human inventors (Rahul Khokhar; Claude is a tool per *Thaler v. Vidal*, 2023).

## Done when
- ✅ Invention disclosure template created
- ✅ `docs/patents/README.md` — index + inventorship rule + status table
- ✅ `docs/patents/STRATEGY.md` — three-bucket plan, filing order, budget table, open questions for counsel
- ✅ Disclosures written for P-001 through P-005 (patentability-strong + possible)
- ⬜ Attorney review of each disclosure
- ⬜ Provisional patent filings completed for Bucket A entries (P-001, P-004 at minimum)
- ⬜ Pre-OSS-publish gate cleared (all Bucket A provisionals filed)

## Child stories / tasks
- P-001: Compose-cycle-id causality binding (patentability: strong) — disclosure ✅
- P-002: Prefix-discriminated tool routing (patentability: possible) — disclosure ✅
- P-003: Symmetric runtime federation (patentability: possible) — disclosure ✅
- P-004: Implicit re-ask inference / 8-second behavioral signal (patentability: strong) — disclosure ✅, live verified ✅
- P-005: Explainable churn derivation (patentability: possible) — disclosure ✅

## Commit
- `52a3a9e` — docs(patents): invention disclosures + filing strategy + ADR-035
