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

test('shares Garamond and white paper with the homepage', async ({ page }) => {
  await page.goto('/')
  const seen = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    family: getComputedStyle(document.body).fontFamily.split(',')[0],
  }))
  expect(seen.bg).toBe('rgb(255, 255, 255)')
  expect(seen.family).toBe('"EB Garamond Variable"')
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

const essays = [
  {
    title: 'Who reviews all these papers?',
    path: '/thoughts/2026-09-18-who-reviews-all-these-papers/',
    first: 'Imagine receiving a paper with a clear argument',
    last: 'is one I am still thinking through.',
  },
  {
    title: 'Why precise information-flow control is still hard for agents',
    path: '/thoughts/2026-09-15-precise-ifc-for-agents/',
    first: 'An agent should be able to use private information',
    last: 'It leaves open the stronger ambition of certifying an already-generated message.',
  },
  {
    title: 'Starting with the problem',
    path: '/thoughts/2026-09-14-starting-with-the-problem/',
    first: 'Writing my teaching statement has made me ask',
    last: 'Building becomes meaningful when we understand whom it serves and why it matters.',
  },
  {
    title: 'Guarantees, not guardrails',
    path: '/thoughts/2026-08-01-guarantees-not-guardrails/',
    first: 'In our work on multi-tool agents, the attack begins',
    last: 'the guarantee lives somewhere it cannot argue with.',
  },
]

test('the index offers takeaways without loading the full essays', async ({ page }) => {
  await page.goto('/thoughts/')
  for (const essay of essays) {
    const entry = page.locator('.entry').filter({ has: page.getByRole('link', { name: essay.title }) })
    await expect(entry.locator('.summary')).not.toBeEmpty()
    await expect(page.getByText(essay.first, { exact: false })).toHaveCount(0)
  }
  await expect(page.locator('.entry h2').first()).toHaveText(essays[0].title)
})

for (const essay of essays) {
  test(`reads ${essay.title} and returns to the index`, async ({ page }) => {
    await page.goto('/thoughts/')
    await page.getByRole('link', { name: essay.title, exact: true }).click()
    await expect(page).toHaveURL(essay.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(essay.title)
    await expect(page).toHaveTitle(`${essay.title} · Jian Cui`)
    await expect(page.locator('.body p').first()).toContainText(essay.first)
    await expect(page.locator('.body p').last()).toContainText(essay.last)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href', `https://cuijian0819.github.io${essay.path}`,
    )
    await page.getByRole('link', { name: 'All thoughts' }).last().click()
    await expect(page).toHaveURL('/thoughts/')
  })

  test(`${essay.title} stays readable on a narrow screen in both themes`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto(essay.path)
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('body')).toHaveCSS('font-family', /EB Garamond Variable/)
    await page.getByRole('button', { name: 'Toggle colour theme' }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 17, 16)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.reload()
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 17, 16)')
  })
}
