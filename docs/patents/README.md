# Patent disclosures + filing strategy

Per ADR-035 the SaaSAgent codebase publishes under Apache 2.0 with provisional
patent applications filed BEFORE the open-source publish. This directory holds
the invention disclosures patent counsel needs to draft the actual filings.

**This is not legal advice and these documents are not filed applications.**
Each disclosure is engineer-authored technical detail intended to be the input
to a patent attorney's drafting process. Status of each is tracked below.

## Inventorship

Per Thaler v. Vidal (Federal Circuit, 2023) USPTO requires named human
inventors. **Rahul Khokhar** is the inventor on every disclosure. Claude (the
LLM AI assistant by Anthropic) is a tool used in the conception process —
analogous to using Mathematica to derive equations or Photoshop to render a
trademark. The human inventor exercised judgment over what to include, what to
exclude, and which problems were worth solving.

## Index of disclosures

| # | Title | Status | Apache-2.0 grant |
|---|---|---|---|
| [P-001](./disclosures/P-001-compose-cycle-id-causality.md) | Compose-cycle-id causality token binding server-composed UI to client emits | draft, ready for counsel review | yes |
| [P-002](./disclosures/P-002-prefix-discriminated-tool-routing.md) | Prefix-discriminated three-tier capability routing for LLM tool-use APIs | draft, ready for counsel review | yes |
| [P-003](./disclosures/P-003-symmetric-federation-contract.md) | Symmetric multi-agent federation: every runtime serves as parent AND sub-agent | draft, ready for counsel review | yes |
| [P-004](./disclosures/P-004-implicit-reask-signal-inference.md) | Implicit negative-signal inference via timing window on follow-up natural-language input | draft, ready for counsel review | yes |
| [P-005](./disclosures/P-005-explainable-churn-derivation.md) | Closed-loop explainable churn-risk derivation with per-feature contribution factors | draft, ready for counsel review | yes |

The Apache-2.0 grant column tracks whether this invention is subject to the
patent license that ships with the source. **All five are**: Apache 2.0 §3
(Grant of Patent License) covers any patent claim "necessarily infringed" by
contributed code. Filing provisionals doesn't withdraw the §3 grant; it
preserves the right to license the patents to third parties on different terms
(e.g. a paid commercial license) and to defend against patent attacks.

## How to use this directory

### When you (Rahul) write code that feels novel
1. Copy `templates/invention-disclosure-template.md` to a new file in
   `disclosures/P-NNN-<short-slug>.md`.
2. Fill in every section. The template prompts you for the things a patent
   attorney needs.
3. Add it to the index table above with status `draft`.
4. Commit. The commit timestamp is contemporaneous evidence of conception.

### When you decide to file
1. Engage a patent attorney (see STRATEGY.md for budget guidance).
2. Send them the disclosure file + a copy of the relevant code at a tagged
   commit. The repo is the reduction to practice.
3. They draft a provisional application and file it with USPTO. Keep the
   filing receipt in `disclosures/filings/P-NNN-receipt.pdf` (gitignored —
   private; reference by hash in the disclosure file).
4. Update the disclosure's status from `draft` to `provisional-filed YYYY-MM-DD`.

### When you decide NOT to file (defensive publication)
1. Explicitly state so in STRATEGY.md.
2. Add the disclosure file to the published OSS repo as part of the Apache 2.0
   release. Defensive publication establishes prior art that prevents others
   from filing on the same invention.

## Anti-patterns

- **Don't promise patents that aren't filed.** Calling something "patent
  pending" requires a filed application (provisional counts).
- **Don't delay disclosure decisions past 12 months from public use / OSS
  publish.** USPTO has a one-year statutory bar; international filings (PCT)
  generally have NO grace period. The Apache 2.0 release date is the start
  of the clock.
- **Don't claim software-architecture composition as patentable.** Combining
  known techniques (SSE + WebSocket + JSON) is not novel. Every disclosure
  in this directory targets a specific non-obvious mechanism.

## See also

- [STRATEGY.md](./STRATEGY.md) — file / publish / abandon decisions per candidate
- [templates/invention-disclosure-template.md](./templates/invention-disclosure-template.md)
- [docs/architecture/adr/](../architecture/adr/) — ADRs document architectural decisions; disclosures document inventions.
