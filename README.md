# SaaS Agent Platform

A universal, embeddable agentic harness for any SaaS enterprise.

> **Status:** Day 0 — grooming the vision and requirements before MVP.
> Read [PLOT.md](PLOT.md) for the one-page narrative.

## Documentation map

| Area | Path |
|---|---|
| Vision (one-pager) | [PLOT.md](PLOT.md) |
| Vision (long form) | [docs/vision.md](docs/vision.md) |
| Functional requirements | [docs/requirements/functional.md](docs/requirements/functional.md) |
| Non-functional requirements | [docs/requirements/non-functional.md](docs/requirements/non-functional.md) |
| Future / aspirational requirements | [docs/requirements/future-requirements.md](docs/requirements/future-requirements.md) |
| Architecture overview | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Tech stack choices | [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) |
| Performance / scaling / optimization | [docs/architecture/optimization.md](docs/architecture/optimization.md) |
| Decision log (ADRs) | [docs/decisions/decision-log.md](docs/decisions/decision-log.md) |
| Novel / patentable ideas | [docs/novel-ideas/ideas.md](docs/novel-ideas/ideas.md) |
| Work tracking | [docs/work/README.md](docs/work/README.md) |

## Automation

Two project-local skills run after each Claude Code conversation:

- **`extract-insights`** — scans the conversation, updates future-requirements / architecture / decisions / novel-ideas docs, optionally opens a PR.
- **`work-management`** — maintains the initiative → epic → story → task hierarchy under `docs/work/`.

Both are wired via the `Stop` hook in `.claude/settings.json`.
