# Decision Log (ADRs)

> Append-only chronological log of every load-bearing decision. The `extract-insights` skill auto-appends entries when conversations conclude with a decision.

## Format

```
## ADR-### — Title
- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded by ADR-### | deprecated
- **Context:** what problem we were solving / what was forcing the decision
- **Options considered:** A, B, C with one-line tradeoff each
- **Decision:** which option, and why
- **Consequences:** what this enables and what it costs
- **Source:** conversation snippet / link
```

---

## ADR-001 — Initialize project as a documentation-first grooming repo before any code
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Rahul wants to groom vision/requirements/architecture before building MVP.
- **Options considered:**
  - A. Start with code scaffold and groom alongside.
  - B. Documentation-first; build MVP only after vision is sharp.
- **Decision:** B. Documentation-first. PLOT.md, vision, requirements, architecture, decisions, novel-ideas, work tracking — all skeletoned upfront.
- **Consequences:** slower start to running code, but every line of code later traces to a groomed requirement and a recorded decision. Reduces re-architecting cost.
- **Source:** Initial conversation 2026-04-26.

## ADR-002 — Two project-local Claude skills wired via Stop hook
- **Date:** 2026-04-26
- **Status:** accepted
- **Context:** Rahul wants automatic post-conversation extraction of insights and automatic work-tracking maintenance.
- **Options considered:**
  - A. Manual invocation by Rahul each time.
  - B. Stop-hook-driven automatic invocation of two skills (`extract-insights`, `work-management`).
  - C. Single skill that does both jobs.
- **Decision:** B. Two separate skills, both invoked by `Stop` hook. Separation keeps each skill's responsibility crisp and lets us iterate on them independently.
- **Consequences:** every `Stop` event now runs two skills, adding latency at session end. Acceptable for now; can be merged later if needed.
- **Source:** Initial conversation 2026-04-26.
