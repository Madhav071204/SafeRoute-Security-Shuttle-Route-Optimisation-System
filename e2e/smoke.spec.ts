import { test, expect } from '@playwright/test'

test.describe('Application smoke', () => {
  test('main route loads without a fatal error and shows the trip planner', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    let requestCount = 0
    page.on('request', () => {
      requestCount += 1
    })

    await page.goto('/')

    // Primary trip-planning interface is visible.
    await expect(page.getByRole('heading', { name: /plan your route/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /trip planner/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add stop/i })).toBeVisible()

    // No fatal client error occurred while loading.
    expect(pageErrors).toEqual([])

    // Give the app a moment to settle, then confirm it is not stuck in an
    // obvious request loop (a runaway loop would fire far more than this).
    await page.waitForTimeout(2500)
    expect(requestCount).toBeLessThan(150)
  })
})
