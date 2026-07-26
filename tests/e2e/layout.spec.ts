import { expect, test } from '@playwright/test'

test('navigation is inline with no hamburger at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  await expect(page.locator('nav a')).toHaveCount(4)
  await expect(page.locator('button.hamburger, .navbar-toggler')).toHaveCount(0)
})

test('theme toggle flips the paper colour and persists', async ({ page }) => {
  await page.goto('/')
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  const before = await bg()
  await page.getByRole('button', { name: /theme/i }).click()
  const after = await bg()
  expect(after).not.toBe(before)

  await page.reload()
  expect(await bg()).toBe(after)
})

test('ships no jQuery or Bootstrap', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url())
  })
  await page.goto('/')
  expect(scripts.join(' ')).not.toMatch(/jquery|bootstrap/i)
})

test('serves the warm paper colour, never Apple blue', async ({ page }) => {
  await page.goto('/')
  const { bg, link } = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    link: getComputedStyle(document.querySelector('main a')!).color,
  }))
  expect(bg).toBe('rgb(251, 248, 243)')
  expect(link).toBe('rgb(181, 101, 74)')
})

test('loads self-hosted fonts and contacts no third-party host', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (url.host !== 'localhost:4321') external.push(r.url())
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(external).toEqual([])
})
