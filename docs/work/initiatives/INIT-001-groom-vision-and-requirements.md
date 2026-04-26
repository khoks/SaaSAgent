# INIT-001 — Groom platform vision and requirements

- **Status:** in-progress
- **Created:** 2026-04-26
- **Last updated:** 2026-04-26
- **Outcome:** A sharp, written, agreed vision and requirements baseline that any future contributor (human or AI) can read and align on without further conversation with Rahul.

## Why
Without a groomed baseline, MVP scope will drift, and architectural decisions will lack traceable rationale.

## Done when
- PLOT.md, docs/vision.md complete and accepted.
- docs/requirements/{functional,non-functional,future-requirements}.md have all known requirements captured.
- docs/architecture/{overview,tech-stack,optimization}.md have at minimum: layer diagram, tech-stack candidates, optimization hot-paths.
- docs/decisions/decision-log.md has ADRs for the ≥10 most load-bearing decisions.
- docs/novel-ideas/ideas.md has all novel ideas surfaced so far.

## Child epics
- (TBD as grooming proceeds)

## Grooming questions

### Batch 1 — closed 2026-04-26
1. ✅ Design-partner vertical for MVP — **e-commerce** ([ADR-003](../../decisions/decision-log.md)).
2. ✅ Embed surface — **WC shell with multi-framework component registry** ([ADR-004](../../decisions/decision-log.md)).
3. ✅ UI rendering model — **runtime composition from host's atomic design system** ([ADR-005](../../decisions/decision-log.md)).
4. ✅ Deployment / multi-tenancy — **self-hosted only inside enterprise's ecosystem** ([ADR-006](../../decisions/decision-log.md)).
5. ✅ Agent runtime — **Claude Agent SDK behind thin internal interface** ([ADR-007](../../decisions/decision-log.md)).

### Batch 2 — open
6. **Memory store architecture** — vector + KG + structured events; embeddable since enterprise hosts.
7. **Atomic-design-system registration protocol** — manual entries vs. auto-extraction from Storybook / Figma / component metadata (or both).
8. **Multi-framework component integration mechanism** — Module Federation? Universal renderer? Per-framework custom-element wrappers?
9. **Theme/branding tokens schema** — Style Dictionary? Spectrum tokens? CSS variables? Custom?
10. **Feature/Service document format** — Markdown w/ frontmatter? YAML? JSON? Hybrid NL/JSON?
11. **Mobile embedding strategy** — React Native? Native SDKs (iOS/Android)? WebView bridge?
12. **Pricing model** under self-hosted constraint — license / per-seat / capacity tier?
13. **Proactive-engine confidence and attention-budget model** — heuristics, signals, gating policies.
14. **UI Composer LLM step** — same model as planner or smaller/cheaper? Cached templates per intent?
15. **Sub-agent isolation model** — process / iframe / VM / none.
16. **Distribution / packaging** — Docker / Helm / standalone binary / installer.
17. **Federated cross-enterprise learning** — opt-in mechanism design (future).
