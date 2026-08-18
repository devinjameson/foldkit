import { expect, test } from '@playwright/test'
import type { FrameLocator, Page } from '@playwright/test'

const PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS = 240_000

const playgroundFrame = async (page: Page, slug: string) => {
  await page.goto(`/playground/${slug}`, { waitUntil: 'domcontentloaded' })
  const frameElement = page.locator('iframe[title="Foldkit Playground"]')
  await expect(frameElement).toBeVisible({
    timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS,
  })
  return page.frameLocator('iframe[title="Foldkit Playground"]')
}

const waitForHydration = (frame: FrameLocator) =>
  expect(frame.locator('[data-foldkit-build]')).toHaveCount(0, {
    timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS,
  })

test.describe.configure({ mode: 'serial' })

test('deployed SSR playground installs, boots, and hydrates', async ({
  page,
}) => {
  const frame = await playgroundFrame(page, 'ssr')
  await expect(
    frame.getByRole('heading', { name: 'Server-rendered counter' }),
  ).toBeVisible({ timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS })
  await waitForHydration(frame)

  const count = frame.locator('#count')
  const initialCount = Number(await count.textContent())
  expect(Number.isFinite(initialCount)).toBe(true)
  await frame.getByRole('button', { name: '+', exact: true }).click()
  await expect(count).toHaveText(String(initialCount + 1))
})

test('deployed SSG playground installs, boots, and hydrates', async ({
  page,
}) => {
  const frame = await playgroundFrame(page, 'ssg')
  await expect(
    frame.getByRole('heading', { name: 'Statically generated home' }),
  ).toBeVisible({ timeout: PLAYGROUND_BOOT_TIMEOUT_MILLISECONDS })
  await waitForHydration(frame)

  const count = frame.getByRole('button', { name: 'Count: 0' })
  await count.click()
  await expect(frame.getByRole('button', { name: 'Count: 1' })).toBeVisible()
})
