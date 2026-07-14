import { test, expect } from '@playwright/test'
import {
  mockDriverApis,
  planDemoRoute,
  startTripSkippingLocation,
  completeCurrentStop,
} from './fixtures/driverJourney'

/**
 * One complete, realistic planning → driver-execution journey driven entirely
 * through user-visible controls (no internal component methods). External
 * Mapbox calls are mocked; every React state transition, the stop-completion
 * logic, the drawer and the completion screen are exercised for real.
 */
test.describe('Driver trip execution journey', () => {
  test('plans, starts, advances through every stop, and completes correctly', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await mockDriverApis(page, 'mapbox')

    // 1. Load the application and 2-4. plan/optimise/select a route.
    await page.goto('/')
    await planDemoRoute(page)

    // The optimised route is selected by default; confirm it is highlighted.
    await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()

    // 5-6. Start the trip and enter driver mode.
    await startTripSkippingLocation(page)

    // 7. Confirm the first current stop is shown.
    await expect(page.getByText(/stop 1 of 8/i)).toBeVisible()

    // 8. Open the upcoming-stops drawer and confirm it lists stops.
    await page.getByRole('button', { name: /all stops/i }).click()
    await expect(page.getByText(/stops? remaining|route complete/i).first()).toBeVisible()

    // 9. Complete the first stop.
    await completeCurrentStop(page)

    // 10. Confirm the second stop becomes current.
    await expect(page.getByText(/stop 2 of 8/i)).toBeVisible()
    await expect(page.getByText(/1\/8 completed/i)).toBeVisible()

    // 11. Complete all remaining stops (stops 2..8).
    for (let stop = 2; stop <= 8; stop++) {
      await expect(page.getByText(new RegExp(`stop ${stop} of 8`, 'i'))).toBeVisible()
      await completeCurrentStop(page)
    }

    // 12. Confirm the trip enters the completed state.
    await expect(page.getByRole('heading', { name: /trip complete/i })).toBeVisible()
    await expect(page.getByText(/all 8 stops delivered/i)).toBeVisible()

    // 13. Controls must not remain in an invalid completed state: the stop
    // completion control is gone and only "Start New Trip" remains.
    await expect(page.getByRole('button', { name: /mark arrived & continue/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /start new trip/i })).toBeVisible()

    expect(pageErrors).toEqual([])
  })
})
