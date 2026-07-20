import { test, expect } from '@playwright/test'

/**
 * Manual production smoke suite — run via `.github/workflows/production-smoke.yml`
 * with `playwright.production.config.ts` (no local webServer).
 * Uses only public synthetic destinations; never records tokens or coordinates.
 */

const PRODUCTION_URL =
  process.env.PRODUCTION_URL ??
  'https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws'

test.use({ baseURL: PRODUCTION_URL })

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toMatchObject({ status: 'ok' })
})

test('homepage loads with trip planner UI', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /plan your route/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /add stop/i })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('mobile viewport has no horizontal document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /trip planner/i })).toBeVisible()
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 1
  })
  expect(overflow).toBe(false)
})
