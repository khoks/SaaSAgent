# P-NNN: <Title — short, technical, claim-oriented>

| Field | Value |
|---|---|
| Disclosure id | P-NNN |
| Inventor | Rahul Khokhar |
| Date of conception | YYYY-MM-DD (when the idea first appeared in commit message / ADR / design doc) |
| Date of reduction to practice | YYYY-MM-DD (when working code committed to repo) |
| Conception evidence | git commit `<hash>`; ADR-NNN (path) |
| Reduction-to-practice evidence | files at git commit `<hash>` (paths) |
| Status | `draft` \| `provisional-filed YYYY-MM-DD` \| `non-provisional-filed YYYY-MM-DD` \| `dedicated-to-public-domain` |
| Assignee | TBD (Rahul Khokhar pending entity formation) |

## 1. Field of the invention

One sentence describing the technical field. Example: "The invention relates
to client-server communication protocols for embeddable AI assistants in web
applications."

## 2. Background — problem

What problem does this solve? What's the state of the art? Be specific about
what existing systems DON'T do well that this invention addresses.

Required:
- Cite at least three existing systems / patents / papers that approach the
  same problem space differently.
- Be honest about prior art that's adjacent — patent applications get
  rejected for ignored prior art.
- Frame the gap as a technical problem, not a business problem.

## 3. Summary of the invention

2-4 paragraphs. The key inventive concept stated plainly. Aim for the level
of detail you'd put in a paper abstract.

## 4. Detailed description

This is the meat. Patent law requires "enablement" — sufficient detail that
a person of ordinary skill in the art could practice the invention without
undue experimentation.

### 4.1 Architecture overview

ASCII or Mermaid diagram of the system. Components named. Data flow shown.

### 4.2 Mechanisms

For each component / step in the diagram:
- What does it do?
- What inputs does it take?
- What outputs does it produce?
- What's the failure mode?
- Why is this NON-OBVIOUS over the prior art?

### 4.3 Embodiments

The specific embodiment that's running in the codebase, plus AT LEAST one
alternative embodiment. Patent claims need to cover the full scope, not just
your one implementation.

### 4.4 Code references (reduction to practice)

Files in the repo that implement this invention. Use full paths from the
repo root + line ranges where relevant.

```
packages/runtime/src/<module>.ts:line-range — <what this code does>
packages/.../etc.
```

## 5. Drawings

Embed the diagrams from §4.1. Add sequence diagrams for any time-ordered
interaction. ASCII art is acceptable for invention disclosures; the patent
attorney will redraw to USPTO conventions.

## 6. Claims (drafted broadly — for attorney review)

Provisional applications technically don't require formal claims, but
drafting them at this stage forces clarity. The attorney will refine.

### Claim 1 (independent method claim)

A method for [...], comprising:
- [step 1]
- [step 2]
- [step 3]
wherein [the inventive aspect].

### Claim 2 (dependent — narrower)

The method of claim 1, further comprising [...].

### Claim 3 (independent system claim)

A system comprising:
- [component 1] configured to [...]
- [component 2] configured to [...]
wherein [the inventive aspect].

### Claim N (independent computer-readable medium claim)

A non-transitory computer-readable medium storing instructions that, when
executed by one or more processors, cause the processors to perform [the
method of claim 1 / a method comprising ...].

## 7. Prior art — known references

Honest list. Including known prior art STRENGTHENS a patent application by
showing the examiner you did your homework.

| Reference | What it teaches | What it doesn't teach (gap) |
|---|---|---|
| ... | ... | ... |

## 8. Apache 2.0 implications

State explicitly: this invention is implemented in code that is or will be
released under Apache 2.0. Apache 2.0 §3 grants a perpetual, worldwide,
royalty-free patent license to anyone using the licensed code. Filing a
patent does NOT withdraw §3; it preserves the right to license to non-OSS
users on different terms and to defend against patent attacks.

## 9. Open questions

Anything the patent attorney needs to advise on:
- Specific scope questions ("should claim 1 cover the case where X is
  optional?")
- Strategic questions ("should we also file in the EU? China?")
- Schedule questions ("should we file before or after the v1 release?")
