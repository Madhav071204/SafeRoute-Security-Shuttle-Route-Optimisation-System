import { defineConfig, devices } from '@playwright/test'

// The suite runs against a *production* server (`next start`) on a dedicated
// port. Production hydration is deterministic (no per-request dev compilation),
// and `next start` is not subject to Next's single-dev-instance-per-directory
// lock, so it coexists with a developer's `next dev` on :3000. A build must
// exist first (`npm run build`); CI and `docs/testing-strategy.md` document this.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3123)
const BASE_URL = `http://127.0.0.1:${PORT}`

// Which browser binary to drive. Locally we default to the OS-installed Chrome
// (`chrome` channel) because the sandbox blocks Playwright's browser CDN behind
// a TLS-intercepting proxy. In CI the CDN is reachable, so we install and use
// Playwright's bundled Chromium by setting PLAYWRIGHT_CHANNEL=chromium (which
// disables the channel override). TLS verification is never disabled.
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL ?? 'chrome'
const CHROMIUM_USE =
  CHANNEL === 'chromium' || CHANNEL === 'bundled'
    ? { ...devices['Desktop Chrome'] }
    : { ...devices['Desktop Chrome'], channel: CHANNEL }

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/production-smoke.spec.ts', '**/production-journey.spec.ts'],
  // Core deterministic tests mock external Mapbox calls, so a single worker
  // against one dev server keeps runs stable and order-independent.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // `list` for readable console output; `html` (never auto-opened) produces a
  // report that CI uploads as an artifact when the browser suite fails.
  reporter: [['list'], ['html', { open: 'never' }]],
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
      use: CHROMIUM_USE,
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
