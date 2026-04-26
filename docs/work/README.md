# Work Tracking

> Auto-maintained by the `work-management` skill. Mirrors a Jira-like Initiative → Epic → Story → Task hierarchy in plain Markdown so it lives in the repo with the rest of the design.

## Hierarchy
- **Initiative** (`initiatives/INIT-###-slug.md`) — strategic outcome (months).
- **Epic** (`epics/EPIC-###-slug.md`) — large feature group (weeks).
- **Story** (`stories/STORY-###-slug.md`) — user-visible behavior (days).
- **Task** (`tasks/TASK-###-slug.md`) — engineering unit (hours / day).

## ID conventions
- `INIT-001`, `EPIC-001`, `STORY-001`, `TASK-001`, …
- Slug = kebab-case short title.
- Each item links upward (parent) and downward (children).

## Status values
`backlog` | `groomed` | `in-progress` | `blocked` | `in-review` | `done` | `cancelled`

## Index
- [Initiatives](initiatives/INDEX.md)
- [Epics](epics/INDEX.md)
- [Stories](stories/INDEX.md)
- [Tasks](tasks/INDEX.md)
