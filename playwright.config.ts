import { defineConfig, devices } from '@playwright/test'

// The suite runs against a *production* server (`next start`) on a dedicated
// port. Production hydration is deterministic (no per-request dev compilation),
// and `next start` is not subject to Next's single-dev-instance-per-directory
// lock, so it coexists with a developer's `next dev` on :3000. A build must
// exist first (`npm run build`); CI and `docs/testing-strategy.md` document this.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3123)
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Core deterministic tests mock external Mapbox calls, so a single worker
  // against one dev server keeps runs stable and order-independent.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      // Drive the OS-installed Chrome ("chrome" channel) rather than a
      // downloaded Chromium build. The sandboxed environment blocks Playwright's
      // browser CDN behind a TLS-intercepting proxy, and we must not disable TLS
      // verification. Using the system browser keeps the suite runnable safely.
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: BASE_URL,
    // Reuse a production server already listening on this port between runs.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
