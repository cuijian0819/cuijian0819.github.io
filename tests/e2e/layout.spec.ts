import { expect, test } from '@playwright/test'

test('navigation is inline with no hamburger at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  await expect(page.locator('nav a')).toHaveCount(3)
  await expect(page.locator('nav a')).toHaveText(['about', 'papers', 'misc'])
  await expect(page.locator('button.hamburger, .navbar-toggler')).toHaveCount(0)
})

test('/writing/ is unlinked but still resolves', async ({ page, request }) => {
  for (const path of ['/', '/misc/', '/news/']) {
    await page.goto(path)
    await expect(page.locator('nav a[href*="writing"]')).toHaveCount(0)
  }
  expect((await request.get('/writing/')).status()).toBe(200)
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

test('the masthead is sticky and actually frosted', async ({ page }) => {
  await page.goto('/')
  const masthead = page.locator('.masthead')

  expect(await masthead.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')

  // Regression guard. Hand-writing `-webkit-backdrop-filter` alongside the
  // standard property made lightningcss emit ONLY the prefixed one, which
  // Chromium ignores, so the nav silently lost its blur while the @supports
  // fallback also never fired. Nothing about the page looked broken.
  const filter = await masthead.evaluate((el) => getComputedStyle(el).backdropFilter)
  expect(filter, 'masthead lost its backdrop-filter in the build').not.toBe('none')
  expect(filter).toContain('blur')
})

test('the masthead stays put when the page scrolls', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, 1200))
  await page.waitForTimeout(150)
  const box = await page.locator('.masthead').boundingBox()
  expect(box!.y).toBeLessThan(2)
})

test('scroll reveal shows content and never strands it hidden', async ({ page }) => {
  await page.goto('/')
  // Everything below the fold starts hidden...
  const total = await page.locator('.reveal').count()
  expect(total).toBeGreaterThan(3)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(900)

  const stillHidden = await page.locator('.reveal:not(.is-visible)').count()
  expect(stillHidden, 'some content never revealed after scrolling to the bottom').toBe(0)
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

// Astro compiles a page's scoped `.foo` to `.foo[data-astro-cid-…]`, which
// outranks the global single-class `.wrap`. A page-level `max-width` or a
// `margin: X 0` shorthand therefore silently overrides the shell width or the
// auto centering, and the page spills to full viewport width. That is exactly
// how /misc/ broke.
const CONTENT_PAGES = ['/', '/misc/', '/news/', '/writing/', '/realme/', '/real_me/']

for (const path of CONTENT_PAGES) {
  test(`content stays within the shell and stays centred on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(path)

    const boxes = await page.locator('main .wrap').evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          left: Math.round(rect.left),
          right: Math.round(window.innerWidth - rect.right),
          width: Math.round(rect.width),
          cls: el.className,
        }
      }),
    )

    expect(boxes.length, 'no .wrap on this page').toBeGreaterThan(0)
    for (const box of boxes) {
      expect(box.width, `${box.cls} spans the full viewport`).toBeLessThan(1300)
      // Equal gutters either side means margin-inline:auto survived.
      expect(Math.abs(box.left - box.right), `${box.cls} is not centred`).toBeLessThanOrEqual(1)
    }
  })
}
