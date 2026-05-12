# ADR-039: OSS publish gate

- **Status**: accepted
- **Date**: 2026-05-12
- **Supersedes**: —
- **Superseded by**: —

## Context

INIT-003's Phase 9 closes with **OSS publication** — the moment we flip the
repo from private to public and announce the launch. Multiple workstreams
contribute to that gate:

- Code: the MVP build must satisfy INIT-002's acceptance criteria.
- Legal: Apache 2.0 license must be in place; provisional patents on
  Bucket A inventions must be on file (ADR-035 / `docs/patents/`).
- Operability: Docker Compose path verified, getting-started guide written,
  NFR validation reviewed.
- Comms: launch announcement drafted, design partners aligned.

Without a documented gate, the team could push public prematurely
(destroying patentability in non-US jurisdictions, leaving onboarding
broken, or shipping unfinished features). This ADR fixes the precise
checklist that gates the public push.

## Decision

The OSS publish gate is satisfied **only when ALL** of the following are
true:

### Code (mechanical — verifiable in CI)

- [x] `pnpm install && pnpm build` succeeds from a fresh clone.
- [x] `pnpm test` passes — currently 504/504 runtime + 71/71 web-shell
      + 5/5 sdk-ts.
- [x] No `--no-verify` commits in the git log.
- [x] [`LICENSE`](../../../LICENSE) at repo root contains Apache 2.0 verbatim.
- [x] [`NOTICE`](../../../NOTICE) at repo root.
- [x] [`README.md`](../../../README.md) at repo root with quick-start path.
- [x] [`docs/getting-started.md`](../getting-started.md) with the
      under-60-minute path documented and tested.

### Functional / acceptance (per INIT-002)

- [x] Substrate runs end-to-end against the Expedia reference integration
      (`apps/demo-expedia/`).
- [x] Bundled eval dashboard surfaces auto-generated per-capability
      metrics (`/dashboard` per ADR-037).
- [x] End-user tier/quota: visible "X remaining" element renders, limits
      enforced (ADR-036).
- [x] Proactive engine fires per ADR-018 / ADR-038 with attention budget.
- [x] DOM observation flows (Phase 5 part 1).
- [ ] Mobile WebView demo runs on Android + iOS — **deferred to v1.5**
      per ADR-017.
- [ ] User-test gate (≥7 of 10 testers complete a workflow strictly faster
      through the agent than the host UI on a second attempt) —
      **deferred until design-partner validation**.

### Legal (manual — real-world action)

- [ ] **Bucket A provisional patents filed (P-001, P-004)** via outside
      counsel at USPTO. See [docs/patents/FILING-CHECKLIST.md](../../patents/FILING-CHECKLIST.md).
- [ ] **P-006 (multi-signal proactive scoring) disclosure drafted +
      filing decision** with counsel.
- [x] Defensive publication of P-002, P-003, P-005 via OSS itself
      (disclosures in repo).

### Operability + comms (manual)

- [x] NFR validation report in [docs/operations/nfr-validation.md](../../operations/nfr-validation.md).
- [ ] Helm chart hardened on a fresh k8s cluster — **deferred to v1**.
- [ ] OSS launch announcement drafted.
- [ ] Design partners (≥ 1) signed off on the public timeline.

## Sequencing constraint

The legal block is **strict serial**: Bucket A patent filings MUST happen
**before** the public push. Per ADR-035, public disclosure destroys
patentability in non-US jurisdictions (EPO, JP, KR, CN — absolute novelty).
US grace period is 12 months, so a misfire there is recoverable, but the
international clock starts immediately.

The Helm chart and user-test gate are explicitly accepted as **deferred to
v1**. They are NOT gates for the open-source release of the MVP — they are
gates for the production-readiness claim. The OSS release is a "here's the
substrate, build with it" release; production-grade deployment is a v1
deliverable.

## Consequences

### Positive

- **Clear, auditable checklist** — anyone with admin can see exactly what's
  left without re-reading the entire INIT-003 plan.
- **Mechanical items are in CI** — won't regress.
- **Legal items are explicit** — the project owner can't accidentally push
  public and lose international patentability.

### Negative

- **The user-test gate is omitted from this gate** intentionally — it
  belongs to a later "production claim" gate, not the OSS publish. Some
  reviewers may push back; the rationale is in the user-test acceptance
  criterion's own gate.
- **Helm chart deferred** means production deployment ergonomics are weaker
  at MVP launch. Acceptable per ADR-026 — Docker Compose is the
  documented path; Helm lands in v1.

### Neutral

- Real-world legal action (counsel engagement + USPTO filing) is the only
  blocker between the current state and the public push.

## Current state at this ADR's authoring (2026-05-12)

All code, functional, and OSS-readiness items are **complete**. Three legal
items remain (Bucket A filings + P-006 disclosure decision) and two
comms items (launch draft + design-partner sign-off). The repo is OSS-
publishable from a code perspective; gate is awaiting legal + comms.

## References

- [ADR-035](./035-provisional-patents-before-oss-publish.md) — why patents
  before publish.
- [INIT-002](../../work/initiatives/INIT-002-define-mvp-and-design-partner.md) — MVP scope + acceptance criteria.
- [INIT-003](../../work/initiatives/INIT-003-build-mvp.md) — Phase 9 details.
- [docs/patents/FILING-CHECKLIST.md](../../patents/FILING-CHECKLIST.md) — real-world steps.
- [docs/operations/nfr-validation.md](../../operations/nfr-validation.md) — NFR row-by-row.
