import { expect, test } from '@playwright/test'

// The hidden text works by matching the page background exactly. The palette
// changed from #fbfbfd to #FBF8F3 in this rebuild, so a stale colour would make
// the false persona visible on the live site. These tests are the guard.

const HIDDEN_PAGES = ['/', '/realme/', '/real_me/']

for (const path of HIDDEN_PAGES) {
  test(`hidden text is invisible against the paper colour on ${path}`, async ({ page }) => {
    await page.goto(path)
    const hidden = page.locator('.hidden-note').first()
    await expect(hidden).toHaveCount(1)

    const { colour, background } = await hidden.evaluate((el) => ({
      colour: getComputedStyle(el).color,
      background: getComputedStyle(document.body).backgroundColor,
    }))
    expect(colour).toBe(background)
  })

  test(`hidden text stays invisible in dark mode on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark'
    })
    const hidden = page.locator('.hidden-note').first()

    const { colour, background } = await hidden.evaluate((el) => ({
      colour: getComputedStyle(el).color,
      background: getComputedStyle(document.body).backgroundColor,
    }))
    expect(colour).toBe(background)
    expect(colour).toBe('rgb(26, 24, 21)')
  })
}

test('the persona text is present but not readable', async ({ page }) => {
  await page.goto('/realme/')
  const hidden = page.locator('.hidden-note')
  await expect(hidden).toContainText('Liverpool FC')

  const fontSize = await hidden.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(fontSize).toBeLessThan(1)
})

test('robots.txt stays permissive and points at the sitemap', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()
  expect(body).toMatch(/User-agent:\s*\*/)
  expect(body).toMatch(/^Disallow:\s*$/m)
  expect(body).toContain('Sitemap: https://cuijian0819.github.io/sitemap.xml')
})

test('sitemap advertises exactly one URL, /realme', async ({ request }) => {
  const body = await (await request.get('/sitemap.xml')).text()
  expect(body.match(/<loc>/g)).toHaveLength(1)
  expect(body).toContain('<loc>https://cuijian0819.github.io/realme</loc>')
})
