import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for SaaSAgent E2E.
 *
 * Tests run against the live demo apps (demo-host / demo-ecommerce / demo-travel)
 * which the runner spins up via `webServer`. The runtime is expected to be
 * running on :8080 already (CI starts it via separate step or the same
 * docker-compose).
 *
 * For local: `pnpm --filter @saasagent/e2e test` after `pnpm --filter
 * @saasagent/runtime exec node dist/index.js` is up.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // demo apps share a runtime; sequential is safer.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @saasagent/demo-ecommerce dev',
      port: 5174,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
