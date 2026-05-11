# STORY-028 — Slice 1.4.0: Vite browser demo host

- **Status:** done
- **Created:** 2026-05-03
- **Last updated:** 2026-05-03
- **Done at:** 2026-05-03
- **Parent epic:** [EPIC-008 — Phase 1 Composition](../epics/EPIC-008-phase-1-composition.md)

## What was built

`apps/demo-host` — a Vite-bundled browser application that embeds `<saas-agent>` inside a mock host page, enabling the full bidirectional protocol loop to run in a real browser tab instead of curl/JSDOM.

### What ships
- `apps/demo-host/` — new Vite workspace app
- `index.html` — mock SaaS host page embedding `<saas-agent>` custom element
- `src/main.ts` — configures `<saas-agent>` with runtime URL + auth stub
- Vite config with `@saasagent/web-shell` aliased for hot-reload
- `pnpm demo:runtime` script — starts runtime server (selects HaikuComposer if `ANTHROPIC_API_KEY` in scope)
- `pnpm demo:host` script — starts Vite dev server at `http://localhost:5173`

### Build output
```
demo-host:build    382 ms
dist/index.html    3.67 kB  (gzip 1.53 kB)
dist/assets/...    5.49 kB  (gzip 2.20 kB)
```

### Runtime loop in-browser
1. `<saas-agent>` connects to runtime via SSE
2. HaikuComposer composes welcome `Card → Heading → Text → Buttons` layout
3. Layout renders in agent panel
4. Button click → `InstructionEnvelope` over WebSocket → re-compose with click's `type` as new intent → SSE re-render

## Commit
`d49241a`

## Notes
- Marks the transition from CLI/JSDOM testing to real-browser validation.
- Phase 1.4.1 (AtomicComponentRegistry REST API), 1.4.2 (DTCG theme tokens importer), and 1.4.3 (error layout rendering) are the next slices on EPIC-008.
