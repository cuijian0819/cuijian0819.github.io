import { expect, test } from '@playwright/test'

// /thoughts/ deliberately wears a different face from the rest of the site:
// EB Garamond on white, no terracotta. These pin the parts that silently break.

test('serves EB Garamond, not the Georgia fallback', async ({ page }) => {
  const fonts: number[] = []
  page.on('response', (r) => {
    if (/eb-garamond.*\.woff2$/.test(r.url())) fonts.push(r.status())
  })
  await page.goto('/thoughts/')
  await page.evaluate(() => document.fonts.ready)
  // Both the roman and the italic: the standfirst and summaries are italic.
  expect(fonts).toEqual([200, 200])
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family}/${f.style}`),
  )
  expect(loaded).toContain('EB Garamond Variable/normal')
  expect(loaded).toContain('EB Garamond Variable/italic')
})

test('the page palette overrides the site tokens', async ({ page }) => {
  await page.goto('/thoughts/')
  const seen = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    family: getComputedStyle(document.body).fontFamily.split(',')[0],
  }))
  expect(seen.bg).toBe('rgb(255, 255, 255)')
  expect(seen.family).toBe('"EB Garamond Variable"')
})

test('leaves every other page on Literata and paper', async ({ page }) => {
  await page.goto('/')
  const seen = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    family: getComputedStyle(document.body).fontFamily.split(',')[0],
  }))
  expect(seen.bg).toBe('rgb(251, 248, 243)')
  expect(seen.family).toBe('"Literata Variable"')
})

test('the year hangs in the margin beside the entry, not on top of it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/thoughts/')
  await page.evaluate(() => document.fonts.ready)
  const year = await page.locator('.year').first().boundingBox()
  const title = await page.locator('.entry-head h2').first().boundingBox()
  expect(year!.x).toBeGreaterThan(0)
  expect(year!.x + year!.width).toBeLessThan(title!.x)
})
