import { expect, test } from '@playwright/test'

const PAGES = ['/', '/misc/', '/news/', '/thoughts/', '/realme/']
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

test('the portrait sits above the bio on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/')
  const bio = await page.locator('.bio').boundingBox()
  const portrait = await page.locator('.portrait').boundingBox()
  expect(portrait!.y).toBeLessThan(bio!.y)
  expect(portrait!.x).toBeLessThan(100)
})

test('portrait, news and papers share one right edge on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const right = async (selector: string) => {
    const box = await page.locator(selector).first().boundingBox()
    return Math.round(box!.x + box!.width)
  }
  const portrait = await right('.portrait')
  expect(await right('.news')).toBe(portrait)
  expect(await right('.paper')).toBe(portrait)
})

test('desktop is wider than a stretched phone layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const bio = await page.locator('.bio p').first().evaluate((el) => el.clientWidth)
  // Regression guard: the bio column was 512px when prose and layout shared one
  // measure. Desktop should read wider than that.
  expect(bio).toBeGreaterThan(600)
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
