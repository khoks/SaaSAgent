# Patent Filing Checklist — Real-World Steps

The implementation work (drafting invention disclosures, ADR-035, strategy
doc) is complete in this repo. The remaining steps are real-world actions
that the project owner must execute outside the repo. This checklist is
the canonical "what's left" reference.

## Before public OSS push

These items gate the OSS publish per ADR-035.

### 1. Engage outside patent counsel

- [ ] Select a US patent attorney experienced in software / AI patents.
- [ ] Share `docs/patents/STRATEGY.md` + the 5 P-NNN disclosure files.
- [ ] Get counsel's read on: (a) which inventions are strongest; (b)
      whether any inventorship questions arise; (c) order of filing.
- [ ] Confirm fee estimate matches the budget in `STRATEGY.md` (~$6,640
      for Bucket A, ~$3k drafting + USPTO micro-entity per provisional).

### 2. File Bucket A provisional applications (USPTO)

- [ ] **P-001 — Compose-cycle-id causality binding** — draft + file
      provisional with counsel.
- [ ] **P-004 — Implicit re-ask negative-signal inference** — draft + file
      provisional with counsel.
- [ ] Record provisional application numbers + filing dates in
      `docs/patents/README.md` status table.
- [ ] Save USPTO filing receipts to a private location (NOT the repo).

### 3. Inventor record-keeping

- [ ] Confirm inventorship: **Rahul Khokhar** (Claude as tool per
      *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022)).
- [ ] Compile a contemporaneous conception+RTP record for each filed
      invention (commit hashes, design docs, dates). Counsel will request
      this if any priority dispute arises later.

### 4. Defensive publication (Bucket B/C)

For P-002 (prefix-discriminated tool routing), P-003 (symmetric federation
contract), and P-005 (explainable churn derivation):

- [ ] Confirm with counsel that publishing these as part of the OSS repo
      constitutes valid defensive publication under 35 U.S.C. §102(a)(1).
- [ ] No filing fees; the OSS publish itself is the defensive publication.

### 5. P-006 — Multi-signal proactive scoring (new candidate)

ADR-038 documents the implementation. The disclosure draft is not yet in
the repo.

- [ ] Draft `docs/patents/disclosures/P-006-multi-signal-proactive-scoring.md`
      following the template at `docs/patents/templates/invention-disclosure-template.md`.
- [ ] Decide with counsel: Bucket A (file) or Bucket B (defensive
      publication)? Recommend Bucket A — the per-signal explainability +
      budget contract is novel and load-bearing for commercial leverage.

### 6. OSS publish

Only after Bucket A is filed:

- [ ] Verify `LICENSE` (Apache 2.0) at repo root.
- [ ] Verify `NOTICE` references the patent strategy.
- [ ] Flip repo visibility to public.
- [ ] Tag a release.
- [ ] Publish launch announcement.

## After public OSS push

### Within 12 months (provisional → non-provisional decision)

- [ ] For each filed provisional: decide whether to convert to a
      non-provisional + PCT application. Convert if commercial leverage is
      clear (active design partners + revenue-bearing tier); abandon if
      not.
- [ ] Budget: ~$10k–$15k per non-provisional + PCT national-phase fees in
      year 18-30. See `docs/patents/STRATEGY.md`.

### Ongoing

- [ ] Maintain `docs/patents/README.md` status table as filings progress.
- [ ] Add new invention disclosures as the product evolves (template at
      `docs/patents/templates/invention-disclosure-template.md`).

## What does NOT need to happen

For clarity — these items appear in the patent space but are explicitly
**out of scope** for the OSS publish gate:

- ❌ International filings (PCT, EPO, JP, KR, CN) at MVP. Defer to year-1
  conversion decision.
- ❌ Trademark filings on "SaaSAgent" — handled separately from patents.
- ❌ Open-Patent-Network / royalty-free-patent commitment (e.g. Apache
  patent pool) — this can come later; the Apache 2.0 §3 grant already
  covers OSS users.
- ❌ Patent prosecution work — that's the attorney's job after filing.

## References

- [docs/patents/STRATEGY.md](STRATEGY.md) — bucket assignments + budget
- [docs/architecture/adr/035-provisional-patents-before-oss-publish.md](../architecture/adr/035-provisional-patents-before-oss-publish.md)
- [docs/architecture/adr/039-oss-publish-gate.md](../architecture/adr/039-oss-publish-gate.md)
