import { expect, test } from '@playwright/test'

test('lists all nine papers on the homepage', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paper')).toHaveCount(9)
})

test('has the anchor /publications/ redirects to', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#papers')).toHaveCount(1)
})

test('marks Jian Cui in every author list', async ({ page }) => {
  await page.goto('/')
  const selves = page.locator('.authors .self')
  expect(await selves.count()).toBe(9)
  for (const text of await selves.allTextContents()) {
    expect(text).toMatch(/^Jian Cui\*?$/)
  }
})

test('renders media links as real anchors, not escaped text', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.media a', { hasText: 'The Wall Street Journal' })).toHaveCount(1)
  await expect(page.locator('.media a', { hasText: 'Dark Reading' })).toHaveCount(1)
  await expect(page.getByText('¡a href')).toHaveCount(0)
})

test('keeps paper titles in title case', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.locator('.paper h3', { hasText: 'Non-Linguistic Elements' }),
  ).toHaveCount(1)
})

test('shows awards on the three papers that have them', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paper .award')).toHaveCount(3)
  await expect(page.locator('.award', { hasText: 'Distinguished Paper Award' })).toHaveCount(1)
})

test('orders papers newest first', async ({ page }) => {
  await page.goto('/')
  const venues = await page.locator('.paper .venue').allTextContents()
  const years = venues.map((v) => Number(v.trim().slice(-4)))
  expect(years).toEqual([...years].sort((a, b) => b - a))
  expect(years[0]).toBe(2026)
})
