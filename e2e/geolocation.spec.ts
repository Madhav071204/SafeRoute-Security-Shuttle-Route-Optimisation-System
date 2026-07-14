import { test, expect } from '@playwright/test'
import { mockGeocodeBatch, mockOptimize, mockRoute, planDemoTrip } from './fixtures/mockApi'

test.describe('Geolocation denied', () => {
  // No geolocation permission granted → getCurrentPosition is denied.
  test.use({ permissions: [] })

  test('planning still completes via the campus fallback and does not crash', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await mockGeocodeBatch(page)
    await mockOptimize(page)
    await mockRoute(page, 'haversine-fallback')

    await page.goto('/')
    await planDemoTrip(page)

    // The route comparison renders — the app did not become blank.
    await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()

    // An understandable fallback state is communicated to the user.
    await expect(page.getByText(/optimising from monash university/i)).toBeVisible()

    expect(pageErrors).toEqual([])
  })
})

test.describe('Geolocation granted', () => {
  // Synthetic public coordinates near Clayton, VIC — not a real user location.
  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: -37.9105, longitude: 145.1363 },
  })

  test('granted permission does not blank the app or trigger a request loop', async ({ page }) => {
    let requestCount = 0
    page.on('request', () => {
      requestCount += 1
    })

    await mockGeocodeBatch(page)
    await mockOptimize(page)
    await mockRoute(page, 'mapbox')

    await page.goto('/')
    await planDemoTrip(page)

    await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()

    // App remains responsive and is not stuck re-requesting in a loop.
    await page.waitForTimeout(2500)
    expect(requestCount).toBeLessThan(200)
  })
})
