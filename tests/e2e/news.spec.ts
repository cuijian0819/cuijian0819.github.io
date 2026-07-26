import { expect, test } from '@playwright/test'

test('homepage shows the five most recent items with no inner scrollbar', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.news-item')).toHaveCount(5)

  const overflow = await page.locator('.news').evaluate((el) => getComputedStyle(el).overflowY)
  expect(overflow).not.toBe('auto')
  expect(overflow).not.toBe('scroll')
})

test('/news/ lists all thirteen', async ({ page }) => {
  await page.goto('/news/')
  await expect(page.locator('.news-item')).toHaveCount(13)
})

test('news is ordered newest first', async ({ page }) => {
  await page.goto('/news/')
  const stamps = await page.locator('.news-item time').evaluateAll((els) =>
    els.map((el) => el.getAttribute('datetime')!),
  )
  expect(stamps).toEqual([...stamps].sort().reverse())
})

test('dates are not shifted by timezone', async ({ page }) => {
  await page.goto('/news/')
  // announcement_13 is dated 2025-10-22 in front matter.
  const item = page.locator('.news-item', { hasText: 'NDSS 2026' }).first()
  await expect(item.locator('time')).toHaveAttribute('datetime', '2025-10-22')
  await expect(item.locator('time')).toHaveText('Oct 22, 2025')
})
