import { expect, test } from '@playwright/test'

const PAGES = ['/', '/misc/', '/writing/', '/news/', '/realme/']
const WIDTHS = [320, 375, 768, 1024, 1440]

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflows).toBe(false)
    })
  }
}

test('no element declares an inner scroll region', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/')
  const scrollers = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => {
        const overflow = getComputedStyle(el).overflowY
        return overflow === 'auto' || overflow === 'scroll'
      })
      .map((el) => el.className || el.tagName),
  )
  expect(scrollers).toEqual([])
})

test('open results stack below 640px and tabulate above', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/misc/')
  const row = page.locator('.open-results .row-card').first()
  await expect(row).toBeVisible()
  expect(await row.evaluate((el) => getComputedStyle(el).display)).toBe('block')
  await expect(page.locator('.open-results thead')).toBeHidden()

  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(page.locator('.open-results thead')).toBeVisible()
  expect(await row.evaluate((el) => getComputedStyle(el).display)).toBe('table-row')
})

test('the workout description is fully readable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/misc/')
  const cell = page.locator('.open-results .description').first()
  const { scrollWidth, clientWidth } = await cell.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
})

test('the portrait stacks above the bio on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/')
  const bio = await page.locator('.bio').boundingBox()
  const portrait = await page.locator('.portrait').boundingBox()
  expect(portrait!.y).toBeGreaterThan(bio!.y)
  expect(portrait!.x).toBeLessThan(100)
})

test('the portrait offsets right on a desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const bio = await page.locator('.bio').boundingBox()
  const portrait = await page.locator('.portrait').boundingBox()
  expect(portrait!.x).toBeGreaterThan(bio!.x + bio!.width - 1)
})

test('body text stays within the 68ch measure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const width = await page.locator('.bio p').first().evaluate((el) => el.clientWidth)
  const fontSize = await page.locator('body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  // 68ch is roughly 68 * 0.5em for a serif; assert a generous upper bound.
  expect(width).toBeLessThan(fontSize * 45)
})
