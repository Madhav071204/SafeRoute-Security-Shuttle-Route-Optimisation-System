import { test, expect } from '@playwright/test'
import { mockGeocodeBatch, mockOptimize, mockRoute, planDemoTrip } from './fixtures/mockApi'

const FALLBACK_NOTICE = /straight-line estimate/i

test.describe('Route fallback presentation', () => {
  test('Haversine fallback response shows the explicit estimate notice', async ({ page }) => {
    await mockGeocodeBatch(page)
    await mockOptimize(page)
    await mockRoute(page, 'haversine-fallback')

    await page.goto('/')
    await planDemoTrip(page)

    await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()
    await expect(page.getByText(FALLBACK_NOTICE)).toBeVisible()
    // The notice must not claim the estimate is live road-network routing.
    await expect(page.getByText(FALLBACK_NOTICE)).toContainText(/approximate/i)
  })

  test('Mapbox response does not show the fallback notice', async ({ page }) => {
    await mockGeocodeBatch(page)
    await mockOptimize(page)
    await mockRoute(page, 'mapbox')

    await page.goto('/')
    await planDemoTrip(page)

    await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()
    await expect(page.getByText(FALLBACK_NOTICE)).toHaveCount(0)
  })
})
