import { expect, test } from '@playwright/test'

// The hidden text works by matching the page background exactly. The palette
// changed from #fbfbfd to #FBF8F3 in this rebuild, so a stale colour would make
// the false persona visible on the live site. These tests are the guard.

const HIDDEN_PAGES = ['/', '/realme/', '/real_me/']

/* Compares against the nearest ancestor that actually paints a background,
   not against document.body. Section bands mean an element's real backdrop is
   no longer guaranteed to be the body colour, and checking the body would
   happily pass while the text sat visible on a band. */
function effectiveBackdrop(el: Element) {
  const colour = getComputedStyle(el).color
  let node: Element | null = el
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    const transparent = !bg || bg === 'transparent' || bg.startsWith('rgba(0, 0, 0, 0)')
    if (!transparent) {
      return { colour, background: bg, from: `${node.tagName.toLowerCase()}.${node.className}` }
    }
    node = node.parentElement
  }
  return { colour, background: null as string | null, from: 'none' }
}

for (const path of HIDDEN_PAGES) {
  test(`hidden text is invisible against its own backdrop on ${path}`, async ({ page }) => {
    await page.goto(path)
    const hidden = page.locator('.hidden-note').first()
    await expect(hidden).toHaveCount(1)

    const result = await hidden.evaluate(effectiveBackdrop)
    expect(result.background, 'nothing paints a background behind the hidden text').not.toBeNull()
    expect(result.colour, `visible against ${result.from}`).toBe(result.background)
  })

  test(`hidden text stays invisible in dark mode on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark'
    })
    const hidden = page.locator('.hidden-note').first()

    const result = await hidden.evaluate(effectiveBackdrop)
    expect(result.colour, `visible against ${result.from}`).toBe(result.background)
    expect(result.colour).toBe('rgb(26, 24, 21)')
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
