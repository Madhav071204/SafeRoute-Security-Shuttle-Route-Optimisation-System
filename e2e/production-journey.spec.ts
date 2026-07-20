import { test, expect, type Page } from '@playwright/test'

/**
 * Full production journey against the live AWS deployment.
 * Uses only synthetic public destinations — no mocks, no real passenger data.
 *
 * Run via: npm run test:e2e:production
 */

const PRODUCTION_URL =
  process.env.PRODUCTION_URL ??
  'https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws'

/** Public Melbourne CBD destinations (synthetic test data only). */
const SYNTHETIC_DESTINATIONS = [
  { query: 'Federation Square Melbourne', label: /federation square/i },
  { query: 'Flinders Street Station Melbourne', label: /flinders street/i },
  { query: 'Melbourne Central', label: /melbourne central/i },
] as const

test.use({ baseURL: PRODUCTION_URL })

async function fillStopFromAutocomplete(page: Page, index: number, query: string, label: RegExp) {
  const inputs = page.getByPlaceholder('Search address, place, or landmark...')
  const input = inputs.nth(index)
  await input.click()
  await input.fill(query)
  const suggestion = page.getByRole('button').filter({ hasText: label }).first()
  await expect(suggestion).toBeVisible({ timeout: 30_000 })
  await suggestion.click()
  await expect(page.getByText('Location selected').nth(index)).toBeVisible({ timeout: 15_000 })
}

test.describe('Production full journey', () => {
  test('planning through driver completion on live AWS', async ({ page, browserName }) => {
    test.info().annotations.push(
      { type: 'browser', description: browserName },
      { type: 'viewport', description: '1280×720 (default desktop)' },
      { type: 'network', description: 'residential/public internet' },
      { type: 'destinations', description: SYNTHETIC_DESTINATIONS.map((d) => d.query).join('; ') },
    )

    const pageErrors: string[] = []
    const failedRequests: string[] = []
    const apiCalls = { optimize: 0, route: 0, geocode: 0 }
    let mapboxTileRequests = 0
    let mapboxSearchRequests = 0

    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('requestfailed', (req) => {
      const url = req.url()
      const failure = req.failure()?.errorText ?? 'failed'
      // Mapbox vector tiles are often aborted when the map pans/zooms — not a functional failure.
      if (failure.includes('ERR_ABORTED') && url.includes('mapbox.com')) return
      if (url.includes('mapbox') || url.includes('/api/')) {
        failedRequests.push(`${req.method()} ${url.split('?')[0]} — ${failure}`)
      }
    })
    page.on('request', (req) => {
      const url = req.url()
      if (/tiles\.mapbox\.com|api\.mapbox\.com\/v4|api\.mapbox\.com\/styles/.test(url)) {
        mapboxTileRequests += 1
      }
      if (url.includes('api.mapbox.com/search/searchbox')) {
        mapboxSearchRequests += 1
      }
      if (url.includes('/api/optimize')) apiCalls.optimize += 1
      if (url.includes('/api/route')) apiCalls.route += 1
      if (url.includes('/api/geocode-batch')) apiCalls.geocode += 1
    })

    // 1. Open HTTPS application
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /plan your route/i })).toBeVisible()

    // 2. Confirm map tiles appear (Mapbox GL canvas)
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible({ timeout: 45_000 })
    await expect(async () => {
      expect(mapboxTileRequests).toBeGreaterThan(0)
    }).toPass({ timeout: 30_000 })

    // 3–5. Add three public destinations with live autocomplete
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /add stop/i }).click()
      const dest = SYNTHETIC_DESTINATIONS[i]
      await fillStopFromAutocomplete(page, i, dest.query, dest.label)
    }
    expect(mapboxSearchRequests).toBeGreaterThan(0)

    // 6. Calculate FIFO and optimised routes
    const optimizeResponse = page.waitForResponse(
      (res) => res.url().includes('/api/optimize') && res.status() === 200,
      { timeout: 90_000 },
    )
    const routeResponses = Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/route') && res.status() === 200),
      page.waitForResponse((res) => res.url().includes('/api/route') && res.status() === 200),
    ])
    await page.getByRole('button', { name: /optimize route/i }).click()
    await optimizeResponse
    await routeResponses

    await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()
    await expect(page.getByText(/\d+\.\d+ km/).first()).toBeVisible({ timeout: 30_000 })

    // 7. Confirm road-route results (not haversine fallback)
    await expect(page.getByText(/straight-line estimate/i)).toHaveCount(0)

    // 8–9. Confirm markers and route line on map
    await expect(page.getByRole('button', { name: /map marker/i })).toHaveCount(4, { timeout: 15_000 })

    // 10. Select FIFO route
    await page.getByText('FIFO Route', { exact: true }).click()

    // 11–12. Start driver mode (skip live geolocation)
    await page.getByRole('button', { name: /^start trip$/i }).click()
    await page.getByRole('button', { name: /^skip$/i }).click()
    await expect(page.getByText(/driver mode/i)).toBeVisible()

    // 13. Current stop appears
    await expect(page.getByText(/stop 1 of 3/i)).toBeVisible()

    // 14. Open upcoming-stops drawer
    await page.getByRole('button', { name: /all stops/i }).click()
    await expect(page.getByText(/stops? remaining/i).first()).toBeVisible()

    // 15–17. Complete all stops and confirm trip completed
    for (let stop = 1; stop <= 3; stop++) {
      await expect(page.getByText(new RegExp(`stop ${stop} of 3`, 'i'))).toBeVisible()
      await page.getByRole('button', { name: /mark arrived & continue/i }).click()
    }
    await expect(page.getByRole('heading', { name: /trip complete/i })).toBeVisible()
    await expect(page.getByText(/all 3 stops delivered/i)).toBeVisible()

    // 20–21. No fatal console errors or request storm
    await page.waitForTimeout(2500)
    expect(pageErrors).toEqual([])
    expect(failedRequests).toEqual([])
    const totalApi = apiCalls.optimize + apiCalls.route + apiCalls.geocode
    expect(totalApi).toBeLessThan(30)
  })

  test('mobile layout at 390×844 has no horizontal overflow', async ({ page }) => {
    test.info().annotations.push({ type: 'viewport', description: '390×844' })

    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /trip planner/i })).toBeVisible()
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible({ timeout: 45_000 })

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth > doc.clientWidth + 1
    })
    expect(overflow).toBe(false)
    expect(pageErrors).toEqual([])
  })
})
