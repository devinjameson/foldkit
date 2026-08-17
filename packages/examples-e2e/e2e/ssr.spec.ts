import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('ssr example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('serves rendered HTML before any JavaScript runs', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    await expect(page.locator('#count')).toHaveText('0')
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)

    await context.close()
  })

  test('hydrates the server DOM and replays the server flags', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )

    await page.getByRole('button', { name: '+' }).click()
    await expect(page.locator('#count')).toHaveText('1')
    await expect(page).toHaveTitle('Count 1')
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )
  })

  test('renders the persisted count on reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.locator('#count')).toHaveText('2')

    await page.reload({ waitUntil: 'commit' })
    await expect(page.locator('#count')).toHaveText('2')
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )
  })

  // A percent-encoded slash decodes to `//index.html`, which the static file
  // server resolves to the unfilled template. The host guard normalizes the
  // path the same way and renders the application instead, so the response
  // must carry the hydration stamp rather than the raw shell.
  test('renders the application for a percent-encoded path to index.html', async ({
    request,
  }) => {
    const response = await request.get('/%2findex.html')

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('data-foldkit-app')
  })
})
