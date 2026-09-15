import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** Wait for webfonts before comparing positions or reading widths. */
async function gotoSettled(page: Page, path: string) {
  await page.goto(path)
  await page.evaluate(() => document.fonts.ready)
}

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
  await gotoSettled(page, '/')
  const bio = await page.locator('.bio').boundingBox()
  const portrait = await page.locator('.portrait').boundingBox()
  expect(portrait!.y).toBeLessThan(bio!.y)
  expect(portrait!.x).toBeLessThan(100)
})

test('profile, bio, news and papers share both margins on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await gotoSettled(page, '/')
  const edges = async (selector: string) => {
    const box = await page.locator(selector).first().boundingBox()
    return [Math.round(box!.x), Math.round(box!.x + box!.width)]
  }
  const profile = await edges('.profile-header')
  expect(await edges('.bio')).toEqual(profile)
  expect(await edges('.news')).toEqual(profile)
  expect(await edges('.paper')).toEqual(profile)
  expect((await edges('.portrait'))[0]).toBe(profile[0])
})

test('desktop gives the bio a readable column below the profile header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await gotoSettled(page, '/')
  const bio = await page.locator('.bio').boundingBox()
  const header = await page.locator('.profile-header').boundingBox()
  expect(bio!.y).toBeGreaterThan(header!.y + header!.height)
  expect(bio!.width).toBeGreaterThan(500)
  expect(bio!.width).toBeLessThan(700)
})

test('desktop pairs the portrait on the left with the name on the right', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await gotoSettled(page, '/')
  // Read both in one frame so the entrance animation cannot skew the comparison.
  const { identity, portrait } = await page.locator('.profile-header').evaluate((el) => ({
    identity: el.querySelector('.identity')!.getBoundingClientRect().toJSON(),
    portrait: el.querySelector('.portrait')!.getBoundingClientRect().toJSON(),
  }))
  expect(identity.x).toBeGreaterThan(portrait.x + portrait.width)
  const center = (box: { y: number; height: number }) => box.y + box.height / 2
  expect(Math.abs(center(identity) - center(portrait))).toBeLessThan(1)
})

test('body text stays within the 68ch measure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await gotoSettled(page, '/')
  const width = await page.locator('.bio p').first().evaluate((el) => el.clientWidth)
  const fontSize = await page.locator('body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  // 68ch is roughly 68 * 0.5em for a serif; assert a generous upper bound.
  expect(width).toBeLessThan(fontSize * 45)
})
