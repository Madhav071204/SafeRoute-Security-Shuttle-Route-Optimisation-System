import { defineConfig, devices } from '@playwright/test'

const PRODUCTION_URL =
  process.env.PRODUCTION_URL ??
  'https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['production-smoke.spec.ts', 'production-journey.spec.ts'],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: PRODUCTION_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
    ...devices['Pixel 5'],
  },
  projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
})
