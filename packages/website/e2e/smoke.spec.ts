import { expect, test } from '@playwright/test'

test('renders the experimental API reference', async ({ page }) => {
  await page.goto('/api-reference/experimental-machine')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Experimental/Machine' }),
  ).toBeVisible()

  const docsNav = page.getByRole('navigation', { name: 'Documentation' })
  await expect(
    docsNav.getByRole('link', {
      name: 'Experimental/Machine',
      exact: true,
    }),
  ).toBeVisible()
  await docsNav
    .getByRole('link', { name: 'Experimental/Server', exact: true })
    .click()

  await expect(page).toHaveURL(/\/api-reference\/experimental-server$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Experimental/Server' }),
  ).toBeVisible()
})

test('selects an item from the combobox', async ({ page }) => {
  await page.goto('/')

  await page
    .getByRole('region', { name: 'Hero' })
    .getByRole('link', { name: 'Learn the architecture' })
    .click()
  await expect(page).toHaveURL(/\/core\/architecture$/)

  const docsNav = page.getByRole('navigation', { name: 'Documentation' })

  await docsNav.getByRole('button', { name: 'Foldkit UI' }).click()
  await docsNav.getByRole('link', { name: 'Combobox', exact: true }).click()
  await expect(page).toHaveURL(/\/ui\/combobox$/)

  const combobox = page
    .getByRole('region', { name: 'Single-Select' })
    .getByRole('combobox')

  await combobox.click()
  await combobox.pressSequentially('Oxf')
  await page.getByRole('option', { name: 'Oxford' }).click()
  await expect(combobox).toHaveValue('Oxford')
})
