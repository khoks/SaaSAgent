# @saasagent/e2e

Playwright end-to-end tests for the SaaSAgent demo apps.

## Run

```bash
# Install playwright browsers once
pnpm --filter @saasagent/e2e exec playwright install chromium

# Make sure the runtime is up
pnpm --filter @saasagent/runtime exec node dist/index.js &

# Run e2e (Playwright spawns the demo-ecommerce dev server automatically)
pnpm --filter @saasagent/e2e test
```

## What's covered

- **demo-ecommerce** — 5 smoke tests cover catalog rendering, cart UI updates,
  semantic event dispatch on add-to-cart, multi-product totals, and DOM
  observer attribute presence.

DOM observer + runtime intercept code paths are tested at the unit level
(`packages/web-shell` + `packages/runtime`); these E2E tests focus on what
the end user sees.
