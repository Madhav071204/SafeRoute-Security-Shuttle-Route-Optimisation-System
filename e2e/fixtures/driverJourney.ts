import { expect, type Page } from '@playwright/test'
import { mockGeocodeBatch, mockOptimize, mockRoute } from './mockApi'

/**
 * Deterministic helpers for driving SafeRoute's full plan → driver-mode journey
 * in a real browser. These build on the existing `/api/*` mocks so the suite
 * never depends on live Mapbox, real browser location, or network stability.
 *
 * Only the *external* boundaries are mocked (geocode / optimize / route /
 * directions). The app's own React state transitions, stop-completion logic,
 * drawer behaviour, persistence and driver controls are exercised for real.
 */

// Synthetic public coordinate near the Clayton/Monash area (not a real user).
export const SYNTHETIC_DRIVER_LOCATION = { latitude: -37.9105, longitude: 145.1363 }

/**
 * Intercept the app's `/api/directions` call with a deterministic straight
 * two-point route. This lets driver mode render turn-by-turn UI without ever
 * contacting Mapbox. Returns a counter so tests can assert the app does not
 * fall into an uncontrolled recalculation loop.
 */
export function mockDirections(page: Page) {
  const counter = { count: 0 }
  page.route('**/api/directions', async (route) => {
    counter.count += 1
    const body = route.request().postDataJSON() as {
      origin: { lat: number; lng: number }
      destination: { lat: number; lng: number }
    }
    const origin = body.origin
    const dest = body.destination
    await route.fulfill({
      json: {
        success: true,
        route: {
          geometry: {
            type: 'LineString',
            coordinates: [
              [origin.lng, origin.lat],
              [dest.lng, dest.lat],
            ],
          },
          distance: 1200,
          duration: 300,
          legs: [{ distance: 1200, duration: 300, steps: [] }],
          steps: [
            {
              instruction: 'Head toward the destination',
              maneuverType: 'depart',
              distance: 1200,
              duration: 300,
              location: { lat: origin.lat, lng: origin.lng },
            },
            {
              instruction: 'Arrive at destination',
              maneuverType: 'arrive',
              distance: 0,
              duration: 0,
              location: { lat: dest.lat, lng: dest.lng },
            },
          ],
        },
      },
    })
  })
  return counter
}

/**
 * Register every deterministic `/api/*` mock the driver journey depends on.
 */
export async function mockDriverApis(page: Page, routeSource: 'mapbox' | 'haversine-fallback' = 'mapbox') {
  await mockGeocodeBatch(page)
  await mockOptimize(page)
  await mockRoute(page, routeSource)
  return mockDirections(page)
}

/**
 * Load demo data, geocode and optimise until the route comparison is shown.
 *
 * The first interaction is hydration-safe: production-rendered buttons are
 * visible before React attaches handlers, so the initial click can be a no-op.
 * We poll (not a fixed delay) until the demo stops appear.
 */
export async function planDemoRoute(page: Page) {
  const loadDemo = page.getByRole('button', { name: /load demo data/i })
  await expect(async () => {
    if (await page.getByText('8/15').isVisible().catch(() => false)) return
    await loadDemo.click({ timeout: 2000 })
    await expect(page.getByText('8/15')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 30_000 })

  await page.getByRole('button', { name: /locate .*address/i }).click()
  await page.getByRole('button', { name: /optimize route/i }).click()

  await expect(page.getByRole('heading', { name: /route comparison/i })).toBeVisible()
}

/**
 * From the planned state, start the trip and enter driver mode using the
 * "Skip" (no live location) path so the journey stays deterministic without
 * depending on browser geolocation. Uses the real Start Trip → location prompt
 * → Skip controls (no internal method calls).
 */
export async function startTripSkippingLocation(page: Page) {
  await page.getByRole('button', { name: /^start trip$/i }).click()
  // The location prompt appears; choose the deterministic "Skip" path.
  await page.getByRole('button', { name: /^skip$/i }).click()
  // Driver mode header is visible.
  await expect(page.getByText(/driver mode/i)).toBeVisible()
}

/**
 * Complete the current stop via the user-visible "Mark Arrived & Continue"
 * control (the real completion handler, not an internal method).
 */
export async function completeCurrentStop(page: Page) {
  await page.getByRole('button', { name: /mark arrived & continue/i }).click()
}

/**
 * Read the "X/Y completed" counter shown in the driver-mode header.
 */
export async function readCompletedCount(page: Page): Promise<number> {
  const text = await page.getByText(/\d+\/\d+ completed/).first().innerText()
  const match = text.match(/(\d+)\/(\d+) completed/)
  return match ? Number(match[1]) : 0
}
