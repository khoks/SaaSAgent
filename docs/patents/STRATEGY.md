# Patent filing strategy

Pragmatic, not aspirational. The team is one engineer (Rahul) with no in-house
patent counsel. The goal is **defensive priority** on a small number of
genuinely novel mechanisms, plus **defensive publication** of the rest so
nobody can come back and patent SaaSAgent's own code against us.

## Three buckets

### Bucket A — File provisionals NOW (priority date matters)

Strong inventions where the priority date directly affects competitive
position. Provisional fees are cheap (~$320 USPTO micro-entity each); the
attorney cost is the real cost (~$2k–4k per disclosure, less if the
disclosures are well-written).

| # | Title | Why file | Estimated cost |
|---|---|---|---|
| **P-001** | Compose-cycle-id causality token | This is the load-bearing primitive that makes agentic UI loops debuggable + auditable + trainable. Competitors building similar systems will reinvent it; getting a priority date matters. | ~$320 USPTO + ~$3k attorney |
| **P-004** | Implicit re-ask signal inference | The most defensible "we did this first" mechanism. Cleanly novel — no prior art search has surfaced this exact pattern in industry. | ~$320 USPTO + ~$3k attorney |

**Total Bucket A budget**: ~$6,640. File before Apache 2.0 OSS publish (per
ADR-035) — the OSS release date is the start of the 12-month non-provisional
deadline AND the start of the international (PCT) bar.

### Bucket B — Defensive publication (Apache 2.0 release IS the publication)

Inventions where the priority date is nice-to-have but not strategically
load-bearing. The Apache 2.0 release establishes prior art; that prior art
prevents others from filing. We retain the §3 patent grant rights to defend
ourselves if someone tries to assert a related patent against us.

| # | Title | Why publish, not file |
|---|---|---|
| **P-002** | Prefix-discriminated tool routing | Compositional with existing tool-use APIs; defensible via OSS release rather than priority. |
| **P-003** | Symmetric federation contract | The architecture is novel but easy to design around; patent wouldn't deter a determined competitor. |
| **P-005** | Explainable churn derivation | Niche; the value is in the model + integration, not the explainability technique alone. |

The publication mechanism is straightforward: each disclosure file is part of
the OSS repo. The Apache 2.0 release date establishes the prior-art date.

### Bucket C — Trade secrets

**None.** SaaSAgent is open-source; everything is public. No secrets to keep.

## Filing order

1. **Before any publish-step** (e.g. `npm publish` or first GitHub Release):
   draft + file provisionals for **P-001** and **P-004**. Get filing receipts
   into your records.
2. **At Apache 2.0 release**: tag the GitHub repo. The tag commit is the
   "publication" date for prior-art purposes. Bucket B disclosures are
   automatically published.
3. **Within 12 months of provisional filing**: decide whether to convert
   each provisional to a non-provisional. This is the expensive step
   (~$8k–15k per non-provisional in attorney fees). Only convert if there's
   genuine commercial signal — paying customers, acquisition interest, or a
   competitor trying to land a similar patent.
4. **Within 12 months of OSS publish**: international (PCT) filing window
   closes for any inventions you want to protect outside the US. If
   important, file PCT before this expires.

## What is NOT being filed

Compositions of known techniques are not novel and not worth filing:

- Bidirectional protocol over SSE + WebSocket → standard; documented in
  ADR-002.
- Polyglot memory (Postgres + Qdrant + Kafka + ClickHouse + Neo4j) →
  standard architecture; documented in ADR-007.
- Sub-Agent SDK shape → standard "framework on top of runtime" pattern.
- Render modes (side-panel / full-page / drawer / eject) → UI-shell
  conventions; documented in ADR-004.
- DOM observation via MutationObserver + IntersectionObserver → standard
  browser APIs.
- Mobile-context detection → standard.
- Telemetry abstraction → standard.

Each of these is enumerated and explicitly disclosed as prior art in the
relevant disclosure file's "Prior art" section.

## Inventorship + assignment

- **Inventor**: Rahul Khokhar (sole inventor on all five disclosures).
- **Assignee**: TBD. Likely an entity Rahul controls (e.g. a Delaware C-corp)
  that simultaneously holds the trademark + commercial license rights to
  SaaSAgent. Until that entity exists, Rahul holds the patent rights
  personally and assigns to the entity at incorporation.

## Budget summary

| Item | Cost (USD) | Timing |
|---|---|---|
| Provisional fee × 2 (USPTO micro-entity) | $640 | before OSS publish |
| Patent attorney drafting × 2 | $4,000 – $8,000 | before OSS publish |
| Decision review at month 11 | (free, internal) | 11 mo after provisional |
| Non-provisional conversion × 2 (if proceeding) | $16,000 – $30,000 | within 12 mo |
| PCT filing × 2 (if international protection wanted) | $4,000 – $8,000 | within 12 mo of OSS publish |
| **Range** | **$640 – $46,640** | over 12 months |

The decision points are real — not every provisional has to convert. A
provisional filed and abandoned at 12 months still establishes a public
prior-art date as long as the disclosure is published.

## Open questions for counsel

These belong on the agenda for the first attorney consult:

1. Does Apache 2.0 §3's "necessarily infringed" patent grant cover the use of
   the patented mechanism in a fork that strips out our copyright notices?
   (Probably yes; confirm.)
2. Does the existence of this `docs/patents/` directory in the OSS repo
   itself constitute a public disclosure that starts the 12-month clock,
   even before the patents are filed? (Likely yes; recommendation: file
   before pushing this directory to a public branch.)
3. Should the assignee entity be set up before filing to avoid an
   inventor-to-entity assignment recordation later? (Probably yes if the
   entity already exists or can be set up quickly.)
4. Are any of P-001 / P-004 better as a continuation strategy (file a
   provisional now, file CIP after each major iteration)? Counsel can
   advise based on competitive-monitoring signal.
