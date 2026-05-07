# ADR-035: Provisional patents filed before OSS publish

- **Status**: accepted
- **Date**: 2026-05-06
- **Supersedes**: —
- **Superseded by**: —

## Context

SaaSAgent is being released as Apache 2.0 open source. Apache 2.0 §3 grants a
royalty-free patent license to anyone using the code under the license terms,
and includes a defensive-termination clause: a licensee that sues an upstream
contributor for patent infringement on the licensed work loses their grant.

That is good for users of the code. It does **not** by itself protect the
project's organization in two scenarios that matter to us:

1. **Asserting against a non-licensee.** If a third party builds a closed,
   non-Apache implementation that reads on a novel mechanism we invented
   (e.g. compose-cycle-id causality, implicit re-ask signal inference), we
   have no offensive lever unless we hold the patent.
2. **Defensive counterclaim posture in adversarial litigation.** If a larger
   incumbent sues us on an unrelated patent, holding our own patents lets us
   counterclaim — without that, we have only the §3 termination, which is
   weak when the adversary is not a licensee of our code.

A separate consideration is **novelty preservation**: in the US, a public
disclosure starts a 12-month grace period to file. Outside the US (EPO, JP,
KR, CN), most jurisdictions require **absolute novelty** — public disclosure
before filing destroys patentability entirely. Open-sourcing the code is
public disclosure.

We have identified five candidate inventions (P-001 through P-005, see
`docs/patents/disclosures/`). Of these, two — P-001 (compose-cycle-id
causality binding) and P-004 (implicit re-ask negative-signal inference) —
have the strongest claim profile and the highest commercial leverage; they
are the **Bucket A** filings.

We need to decide whether to file provisional patents on Bucket A inventions
**before** the public OSS publish, or to publish first and rely on the §3
grant alone.

## Decision

We will **file provisional patent applications on Bucket A inventions
(P-001, P-004) before the public OSS publish**, and continue to ship those
mechanisms under Apache 2.0.

We will publish P-002, P-003, and P-005 as **defensive publications** via the
OSS release itself — the disclosures sit in `docs/patents/disclosures/` and
the implementations are in the public repo, establishing prior art that
prevents anyone else from patenting them.

Specifically:

- File two US provisional applications (USPTO) covering P-001 and P-004
  before any public push of the repository to its public-facing remote.
- Mark the inventor as **Rahul Khokhar** (human inventor; Claude is a tool
  per *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022)).
- Within the 12-month provisional window, decide per-invention whether to
  convert to non-provisional + PCT, or let the provisional lapse.
- Preserve the Apache 2.0 §3 grant unchanged. Filing a patent does not alter
  the license terms — every user of the code receives the same royalty-free
  grant they always did. Commercial-tier licensing and counterclaim rights
  operate **outside** the §3 path.

## Consequences

### Positive

- **Offensive optionality** against non-licensee implementations of P-001 and
  P-004 for up to 20 years from the non-provisional filing.
- **Counterclaim leverage** in adversarial patent litigation.
- **Novelty preserved** in non-US jurisdictions, keeping PCT national-phase
  filings open.
- **No friction for OSS users**: Apache 2.0 §3 grant is intact; users
  including the Bucket A mechanisms in their own deployments are covered.
- **Defensive publication** of P-002/P-003/P-005 prevents third-party
  patenting on those mechanisms without us paying filing fees.

### Negative

- **Cost**: ~$320 per provisional in USPTO micro-entity fees + ~$3,000
  attorney drafting per filing; ~$6,640 for Bucket A. Non-provisional
  conversion within 12 months adds ~$10k–$15k per invention. Full PCT +
  national-phase budget is in `docs/patents/STRATEGY.md`.
- **Filing-window discipline**: cannot push the public repo to its
  public-facing remote until provisionals are on file. This blocks the
  external launch by the time-to-file window.
- **Inventor record-keeping**: must maintain a contemporaneous record of
  conception and reduction-to-practice (commit hashes, design docs, dates)
  in case of later disputes.
- **Optics**: some OSS communities are reflexively hostile to patents even
  when the license grants them. We will need a clear public statement that
  the §3 grant is unchanged and that the patents exist for defensive and
  commercial-tier purposes.

### Neutral

- Provisional applications are not examined and not published; if we let
  them lapse, no public record results, and we retain the option to file
  later (limited by intervening prior art).
- We can decide per-invention at the 12-month mark whether the commercial
  case justifies non-provisional conversion.

## Implementation notes

- `docs/patents/STRATEGY.md` — bucket assignments, filing order, budget
  table, open questions for outside counsel.
- `docs/patents/README.md` — index of disclosures with status (drafted /
  filed / abandoned / published-defensively).
- `docs/patents/templates/invention-disclosure-template.md` — template for
  future disclosures.
- `docs/patents/disclosures/P-NNN-*.md` — one file per invention.

The OSS publish gate is: **Bucket A provisionals on file → publish**. Bucket
B/C disclosures publishing is part of the OSS publish itself (they are
already in the repo as defensive publications).

## References

- Apache License 2.0, §3 (Grant of Patent License) and §8 (Limitation of
  Liability).
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — human-inventor
  requirement under 35 U.S.C. §100(f).
- 35 U.S.C. §102(b) — one-year US grace period after public disclosure.
- EPC Article 54 — absolute novelty in the European Patent Convention.
