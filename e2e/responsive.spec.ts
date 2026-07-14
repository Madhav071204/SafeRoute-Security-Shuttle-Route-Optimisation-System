import { test, expect } from '@playwright/test'

const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

async function horizontalOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
}

for (const vp of [
  { name: 'mobile', size: MOBILE },
  { name: 'desktop', size: DESKTOP },
]) {
  test.describe(`Responsive accessibility smoke (${vp.name})`, () => {
    test.use({ viewport: vp.size })

    test('primary controls are reachable and main content is visible', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('heading', { name: /plan your route/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /add stop/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /load demo data/i })).toBeVisible()

      // A user can reach a primary control via keyboard focus.
      const addStop = page.getByRole('button', { name: /add stop/i })
      await addStop.focus()
      await expect(addStop).toBeFocused()
    })
  })
}

test.describe('Horizontal document overflow', () => {
  test('desktop has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2)
  })

  test('mobile has no horizontal overflow and the nav collapses into a menu', async ({ page }) => {
    // Previously a confirmed defect: the top navigation did not collapse at
    // mobile widths, so the document overflowed horizontally (~400px) at a
    // 390px viewport. The navbar now collapses its links into a menu button.
    await page.setViewportSize(MOBILE)
    await page.goto('/')

    // At the 390px mobile viewport there is no horizontal document overflow.
    const viewportWidth = page.viewportSize()?.width
    expect(viewportWidth).toBe(390)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2)

    // The full desktop link row is collapsed; a menu button exposes the links.
    const menuButton = page.getByRole('button', { name: /open navigation menu/i })
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    await expect(
      page.locator('#mobile-nav-menu').getByRole('link', { name: 'Dispatcher' })
    ).toBeVisible()

    // Opening the menu must not introduce horizontal overflow either.
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2)
  })
})
