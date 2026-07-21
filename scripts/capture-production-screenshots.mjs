/**
 * Capture production screenshots for portfolio documentation.
 * Synthetic public destinations only. Not part of the CI suite.
 *
 * Usage:
 *   npx playwright test scripts/capture-production-screenshots.mjs --config=playwright.production.config.ts
 *
 * Or run via Node after Playwright is installed:
 *   node --experimental-vm-modules ... (prefer the shell wrapper below)
 */

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'docs', 'images')
const BASE =
  process.env.PRODUCTION_URL ??
  'https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws'

const DESTINATIONS = [
  { query: 'Federation Square Melbourne', label: /federation square/i },
  { query: 'Flinders Street Station Melbourne', label: /flinders street/i },
  { query: 'Melbourne Central', label: /melbourne central/i },
]

mkdirSync(OUT, { recursive: true })

async function fillStop(page, index, query, label) {
  const inputs = page.getByPlaceholder('Search address, place, or landmark...')
  const input = inputs.nth(index)
  await input.click()
  await input.fill(query)
  const suggestion = page.getByRole('button').filter({ hasText: label }).first()
  await suggestion.waitFor({ state: 'visible', timeout: 30_000 })
  await suggestion.click()
  await page.getByText('Location selected').nth(index).waitFor({ state: 'visible', timeout: 15_000 })
}

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false, type: 'png' })
  console.log('wrote', path)
}

async function main() {
  const browser = await chromium.launch({ channel: 'chromium', headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  // 1. Main trip-planning screen
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /plan your route|trip planner/i }).first().waitFor({ timeout: 45_000 })
  await page.locator('.mapboxgl-canvas').waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForTimeout(2500)
  await shot(page, '01-trip-planning.png')

  // 2. Address-entry / autocomplete
  await page.getByRole('button', { name: /add stop/i }).click()
  const firstInput = page.getByPlaceholder('Search address, place, or landmark...').first()
  await firstInput.click()
  await firstInput.fill(DESTINATIONS[0].query)
  await page
    .getByRole('button')
    .filter({ hasText: DESTINATIONS[0].label })
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
  await shot(page, '02-address-autocomplete.png')
  await page
    .getByRole('button')
    .filter({ hasText: DESTINATIONS[0].label })
    .first()
    .click()
  await page.getByText('Location selected').first().waitFor({ state: 'visible', timeout: 15_000 })

  for (let i = 1; i < DESTINATIONS.length; i++) {
    await page.getByRole('button', { name: /add stop/i }).click()
    await fillStop(page, i, DESTINATIONS[i].query, DESTINATIONS[i].label)
  }

  // 3–4. Compare + map with route
  const optimizeResponse = page.waitForResponse(
    (res) => res.url().includes('/api/optimize') && res.status() === 200,
    { timeout: 90_000 }
  )
  const routeResponses = Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/route') && res.status() === 200),
    page.waitForResponse((res) => res.url().includes('/api/route') && res.status() === 200),
  ])
  await page.getByRole('button', { name: /optimize route/i }).click()
  await optimizeResponse
  await routeResponses
  await page.getByRole('heading', { name: /route comparison/i }).waitFor({ timeout: 30_000 })
  await page.waitForTimeout(2000)
  await shot(page, '03-fifo-vs-optimised.png')

  // Focus map area if possible
  const map = page.locator('.mapboxgl-canvas').first()
  await map.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  await shot(page, '04-map-markers-route.png')

  // 5. Driver mode
  await page.getByText('Optimised Route', { exact: true }).click().catch(async () => {
    await page.getByText(/optimised|optimized/i).first().click()
  })
  await page.getByRole('button', { name: /^start trip$/i }).click()
  await page.getByRole('button', { name: /^skip$/i }).click()
  await page.getByText(/driver mode/i).waitFor({ timeout: 30_000 })
  await page.getByText(/stop 1 of 3/i).waitFor({ timeout: 15_000 })
  await page.getByRole('button', { name: /all stops/i }).click()
  await page.waitForTimeout(1500)
  await shot(page, '05-driver-mode.png')

  // Close drawer if open, complete stops for completed state
  await page.keyboard.press('Escape').catch(() => {})
  for (let stop = 1; stop <= 3; stop++) {
    await page.getByText(new RegExp(`stop ${stop} of 3`, 'i')).waitFor({ timeout: 15_000 })
    await page.getByRole('button', { name: /mark arrived & continue/i }).click()
  }
  await page.getByRole('heading', { name: /trip complete/i }).waitFor({ timeout: 30_000 })
  await page.waitForTimeout(1000)
  await shot(page, '07-trip-complete.png')

  // 6. Mobile layout — fresh plan view
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /plan your route|trip planner/i }).first().waitFor({ timeout: 45_000 })
  await page.locator('.mapboxgl-canvas').waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForTimeout(2500)
  await shot(page, '06-mobile-layout.png')

  await browser.close()
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
