import { expect, test } from '@playwright/test'

// Every path here is live on the current site. None may 404 after the rebuild.
const LIVE = ['/', '/misc/', '/news/', '/realme/', '/real_me/']

for (const path of LIVE) {
  test(`${path} returns 200`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(200)
  })
}

test('/publications/ reaches the homepage papers anchor', async ({ page }) => {
  await page.goto('/publications/')
  await page.waitForURL(/#papers$/)
  await expect(page.locator('#papers')).toBeVisible()
})

test('/cv/ reaches the real CV pdf, not the missing example_pdf.pdf', async ({ page }) => {
  const response = await page.goto('/cv/')
  const html = await response!.text()
  expect(html).toContain('/assets/pdf/CV_Jian.pdf')
  expect(html).not.toContain('example_pdf.pdf')
})

test('/blog/ and /projects/ redirect to the homepage', async ({ page, request }) => {
  for (const path of ['/blog/', '/projects/']) {
    // Fetched rather than navigated: the meta refresh fires instantly, and the
    // response body is gone by the time page.goto() resolves.
    const html = await (await request.get(path)).text()
    expect(html).toContain('http-equiv="refresh"')
    expect(html).toMatch(/url=\/["']/)

    // And confirm it actually lands on the homepage.
    await page.goto(path)
    await page.waitForURL((url) => url.pathname === '/')
    await expect(page.locator('h1')).toHaveText('Jian Cui')
  }
})

test('the CV pdf itself is served', async ({ request }) => {
  const response = await request.get('/assets/pdf/CV_Jian.pdf')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('pdf')
})

test('every local paper pdf link resolves', async ({ page, request }) => {
  await page.goto('/')
  const hrefs = await page
    .locator('.meta a')
    .evaluateAll((els) =>
      els
        .map((e) => (e as HTMLAnchorElement).getAttribute('href')!)
        .filter((h) => h.startsWith('/')),
    )
  expect(hrefs.length).toBeGreaterThan(0)
  for (const href of hrefs) {
    expect((await request.get(href)).status(), `${href} is broken`).toBe(200)
  }
})

test('404 page is generated', async ({ request }) => {
  const response = await request.get('/definitely-not-a-page')
  expect(response.status()).toBe(404)
  expect(await response.text()).toContain('Page not found')
})

test('has Open Graph tags and no al-folio boilerplate', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)

  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description).not.toMatch(/whitespace theme|al-folio/i)
  expect(description).toMatch(/agentic AI/i)
})

test('no al-folio credit anywhere in the page', async ({ page }) => {
  await page.goto('/')
  const html = await page.content()
  expect(html).not.toMatch(/al-folio/i)
})
