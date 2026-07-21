import { expect, type Page } from '@playwright/test'

/**
 * Deterministic mocks for SafeRoute's own API routes. These intercept the
 * browser's calls to /api/* so end-to-end tests never depend on live Mapbox
 * connectivity. Only synthetic public coordinates are used.
 */

type RouteSource = 'mapbox' | 'haversine-fallback'

// Synthetic coordinates around the Clayton/Monash area (public, not a user's real location).
function syntheticCoord(index: number) {
  return { lat: -37.9 + index * 0.01, lng: 145.1 + index * 0.01 }
}

export async function mockGeocodeBatch(page: Page) {
  await page.route('**/api/geocode-batch', async (route) => {
    const body = route.request().postDataJSON() as {
      addresses: { id: string; address: string }[]
    }
    const results = body.addresses.map((a, i) => ({
      id: a.id,
      success: true,
      coordinates: syntheticCoord(i),
    }))
    await route.fulfill({ json: { results } })
  })
}

export async function mockOptimize(page: Page) {
  await page.route('**/api/optimize', async (route) => {
    const body = route.request().postDataJSON() as {
      stops: { id: string }[]
    }
    const orderedStopIds = body.stops.map((s) => s.id)
    await route.fulfill({ json: { orderedStopIds, totalDistanceKm: 12.3 } })
  })
}

export async function mockRoute(page: Page, source: RouteSource) {
  await page.route('**/api/route', async (route) => {
    const body = route.request().postDataJSON() as { orderedStopIds: string[] }
    const ids = body.orderedStopIds ?? []
    const legs = ids.map((id, i) => ({
      fromStopId: i === 0 ? 'origin' : ids[i - 1],
      toStopId: id,
      distanceKm: 2,
      durationMinutes: 3,
    }))
    await route.fulfill({
      json: {
        polyline: source === 'mapbox' ? 'mock_polyline' : '',
        legs,
        totalDistanceKm: ids.length * 2,
        totalDurationMinutes: ids.length * 3,
        routeSource: source,
        isFallback: source === 'haversine-fallback',
      },
    })
  })
}

/**
 * Drive the full plan flow: load demo data, geocode, then optimize.
 *
 * The first interaction is hydration-safe: in Next dev mode the server-rendered
 * buttons are visible before React attaches its click handlers, so the initial
 * click can be a no-op. We poll (not a fixed delay) until the demo stops appear,
 * re-clicking only while the trip is still empty.
 */
export async function planDemoTrip(page: Page) {
  const loadDemo = page.getByRole('button', { name: /load demo data/i })
  await expect(async () => {
    if (await page.getByText('8/15').isVisible().catch(() => false)) return
    await loadDemo.click({ timeout: 2000 })
    await expect(page.getByText('8/15')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 30_000 })

  // Once hydrated, the geocode and optimize controls behave normally.
  await page.getByRole('button', { name: /locate .*address/i }).click()
  await page.getByRole('button', { name: /optimize route/i }).click()
}
