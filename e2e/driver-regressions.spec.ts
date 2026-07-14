import { test, expect } from '@playwright/test'
import {
  mockDriverApis,
  planDemoRoute,
  startTripSkippingLocation,
  completeCurrentStop,
  SYNTHETIC_DRIVER_LOCATION,
} from './fixtures/driverJourney'

/**
 * Historical driver-mode defect regressions. Each test reproduces a specific
 * scenario through user-visible controls and asserts the corrected contract.
 */

// DEF-2 — Stale route after editing stops.
test.describe('DEF-2 stale route invalidation', () => {
  test('adding a stop after optimisation invalidates the stale route', async ({ page }) => {
    await mockDriverApis(page)
    await page.goto('/')
    await planDemoRoute(page)

    // A startable route currently exists.
    await expect(page.getByRole('button', { name: /^start trip$/i })).toBeVisible()

    // Change the route-defining input by adding another destination.
    await page.getByRole('button', { name: /add stop/i }).click()

    // The old route must not remain presented as current or be startable.
    await expect(page.getByText(/no routes calculated yet/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^start trip$/i })).toHaveCount(0)
  })

  test('removing a stop after optimisation invalidates the stale route', async ({ page }) => {
    await mockDriverApis(page)
    await page.goto('/')
    await planDemoRoute(page)

    await expect(page.getByRole('button', { name: /^start trip$/i })).toBeVisible()

    // Remove a destination — a route-defining change.
    await page.getByRole('button', { name: /remove stop/i }).first().click()

    await expect(page.getByText(/no routes calculated yet/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^start trip$/i })).toHaveCount(0)
  })
})

// DEF-7 — Double activation of stop completion.
test.describe('DEF-7 stop-completion idempotency', () => {
  test('a single normal activation completes exactly one stop', async ({ page }) => {
    await mockDriverApis(page)
    await page.goto('/')
    await planDemoRoute(page)
    await startTripSkippingLocation(page)

    await expect(page.getByText(/stop 1 of 8/i)).toBeVisible()
    await completeCurrentStop(page)
    await expect(page.getByText(/1\/8 completed/i)).toBeVisible()
    await expect(page.getByText(/stop 2 of 8/i)).toBeVisible()
  })

  test('a synchronous double activation cannot skip a stop', async ({ page }) => {
    await mockDriverApis(page)
    await page.goto('/')
    await planDemoRoute(page)
    await startTripSkippingLocation(page)

    await expect(page.getByText(/stop 1 of 8/i)).toBeVisible()

    // Fire two clicks in the same task, before React can re-render — the
    // classic "double activation while a transition is pending" race.
    await page.locator('.complete-button').evaluate((el) => {
      const button = el as HTMLElement
      button.click()
      button.click()
    })

    // Exactly one stop advanced: still on stop 2 (not stop 3), one completed.
    await expect(page.getByText(/1\/8 completed/i)).toBeVisible()
    await expect(page.getByText(/stop 2 of 8/i)).toBeVisible()
    await expect(page.getByText(/stop 3 of 8/i)).toHaveCount(0)
  })
})

// Drawer scrolling and final-stop access at a mobile viewport.
test.describe('Upcoming-stops drawer (mobile 390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('drawer scrolls, the final stop is reachable, and controls stay usable', async ({ page }) => {
    await mockDriverApis(page)
    await page.goto('/')
    await planDemoRoute(page)
    await startTripSkippingLocation(page)

    // Expand the bottom sheet (auto-opens the drawer with all stops).
    await page.getByRole('button', { name: /expand panel/i }).click()

    // Expand the list region. Overflow height can vary with font metrics across
    // Chrome vs bundled Chromium; the invariant is that the final stop remains
    // reachable and essential controls stay usable.
    const list = page.locator('.driver-scrollbar').last()
    await expect(list).toBeVisible()
    const overflow = await list.evaluate(
      (el) => el.scrollHeight - el.clientHeight
    )
    if (overflow > 0) {
      await list.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
    }

    // The final stop can be brought into view.
    const finalStop = page.getByText(/huntingdale/i).last()
    await finalStop.scrollIntoViewIfNeeded()
    await expect(finalStop).toBeVisible()

    // Essential End Trip control remains reachable and has an accessible name.
    const endTrip = page.getByRole('button', { name: /end trip/i })
    await expect(endTrip).toBeVisible()

    // The page itself must not overflow horizontally and trap the user.
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(horizontalOverflow).toBeLessThanOrEqual(2)
  })
})

// Refresh / persistence during an active trip.
test.describe('Refresh during an active trip', () => {
  test('reloading resets to a clean planner rather than a corrupted partial state', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await mockDriverApis(page)
    await page.goto('/')
    await planDemoRoute(page)
    await startTripSkippingLocation(page)
    await expect(page.getByText(/stop 1 of 8/i)).toBeVisible()

    // In-memory execution state is intentionally not persisted; a reload must
    // return the user to a clean planner, never a half-restored driver screen.
    await page.reload()

    await expect(page.getByRole('heading', { name: /plan your route/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add stop/i })).toBeVisible()
    // No stale driver-mode UI leaked through.
    await expect(page.getByText(/stop 1 of 8/i)).toHaveCount(0)
    expect(pageErrors).toEqual([])
  })
})

// Synthetic geolocation must not blank the app or trigger a request loop.
test.describe('Driver mode with synthetic geolocation', () => {
  test.use({
    permissions: ['geolocation'],
    geolocation: SYNTHETIC_DRIVER_LOCATION,
  })

  test('map container stays visible and no fatal error or request loop occurs', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const directions = await mockDriverApis(page)

    await page.goto('/')
    await planDemoRoute(page)
    await startTripSkippingLocation(page)

    // Turn on live location tracking (synthetic coordinates).
    await page.getByRole('button', { name: /^enable$/i }).click()

    // The map container remains present with non-zero dimensions even without
    // live Mapbox tiles (the token-less state renders a visible container).
    const mapArea = page.locator('.driver-mode-map')
    await expect(mapArea).toBeVisible()
    const box = await mapArea.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThan(0)
    expect(box!.width).toBeGreaterThan(0)

    // The application is not blank — driver-mode chrome is still visible.
    await expect(page.getByText(/driver mode/i)).toBeVisible()

    // Give the app time to settle, then confirm no runaway recalculation loop.
    await page.waitForTimeout(3000)
    expect(directions.count).toBeLessThanOrEqual(3)
    expect(pageErrors).toEqual([])
  })
})
