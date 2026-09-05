import { expect, test } from '@playwright/test'

test('selects and persists themes from the keyboard-accessible menu', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/core/architecture', { waitUntil: 'networkidle' })

  const trigger = page.locator('#theme-menu-button')
  const menu = page.getByRole('menu')

  await expect(trigger).toHaveAccessibleName('Theme: System')
  await trigger.click()
  await expect(menu.getByRole('menuitem')).toHaveCount(3)
  await menu.getByRole('menuitem', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(trigger).toHaveAccessibleName('Theme: Dark')
  await expect(trigger).toBeFocused()
  await expect(menu).toBeHidden()

  await page.reload({ waitUntil: 'networkidle' })
  await expect(trigger).toHaveAccessibleName('Theme: Dark')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await trigger.press('ArrowDown')
  await menu.press('Home')
  await menu.press('Enter')
  await expect(trigger).toHaveAccessibleName('Theme: Light')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(trigger).toBeFocused()

  await trigger.press('ArrowDown')
  await menu.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await menu.getByRole('menuitem', { name: 'System', exact: true }).click()
  await expect(trigger).toHaveAccessibleName('Theme: System')
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(trigger).toHaveAccessibleName('Theme: System')

  await page.goto('/', { waitUntil: 'networkidle' })
  await trigger.click()
  await menu.getByRole('menuitem', { name: 'Light', exact: true }).click()
  await expect(trigger).toHaveAccessibleName('Theme: Light')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('aligns mobile navigation icons without shrinking the menu tap target', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/core/architecture', { waitUntil: 'networkidle' })

  const menuButton = page.getByRole('button', { name: 'Toggle menu' })
  const menuIcon = menuButton.locator('svg')
  const sectionSummary = page.locator('#mobile-table-of-contents summary')
  const sectionIcon = sectionSummary.locator('svg')
  const article = page.locator('.docs-content')
  const logo = page.locator('header img')

  const menuIconRight = await menuIcon.evaluate(
    element => element.getBoundingClientRect().right,
  )
  const sectionIconRight = await sectionIcon.evaluate(
    element => element.getBoundingClientRect().right,
  )
  const menuButtonBounds = await menuButton.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height, right: bounds.right }
  })
  const articleInset = await article.evaluate(element =>
    Number.parseFloat(getComputedStyle(element).paddingLeft),
  )
  const logoInset = await logo.evaluate(
    element => element.getBoundingClientRect().left,
  )
  const sectionInset = await sectionSummary.evaluate(element =>
    Number.parseFloat(getComputedStyle(element).paddingLeft),
  )

  expect(Math.abs(menuIconRight - sectionIconRight)).toBeLessThan(1)
  expect(menuButtonBounds.width).toBeGreaterThanOrEqual(40)
  expect(menuButtonBounds.height).toBeGreaterThanOrEqual(40)
  expect(menuButtonBounds.right).toBeGreaterThan(menuIconRight)
  expect(logoInset).toBeLessThan(articleInset)
  expect(sectionInset).toBe(logoInset)

  await menuButton.click()
  const dialog = page.getByRole('dialog', { name: 'Navigation menu' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close menu' }).click()
  await expect(menuButton).toBeFocused()
})
