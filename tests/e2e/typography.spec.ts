import { expect, test } from '@playwright/test'

// Astro collapses the newline between text and a following tag, so
//   name as
//   <a>the rock star</a>
// renders as "name asthe rock star". Every inline link needs an explicit {' '}.
// These assertions pin the spots where prose runs into a link or an <i>.

const EXPECTED_PHRASES: Record<string, string[]> = {
  '/': [
    'same name as the legendary Chinese rock star',
    'under the guidance of Professor Xiaojing Liao',
    'degrees in EE from KAIST',
    'advised by Professor Seungwon Shin',
  ],
  '/misc/': [
    'Born and reared in Yanbian Korean Autonomous Prefecture, Jilin, China',
    'Korean-Chinese (a.k.a Koreans in China)',
    'fitness motto is "Run faster than lifter',
    'Started CrossFit at We Crossfit Yangjae',
    'three times a week at University Avenue CrossFit',
    'Training at Invictus Fitness Seattle',
    'Started Bouldering at Yangjae The Climb',
    'Sometimes climbing at ARC UIUC',
  ],
}

for (const [path, phrases] of Object.entries(EXPECTED_PHRASES)) {
  test(`prose runs into inline links with a space on ${path}`, async ({ page }) => {
    await page.goto(path)
    // Collapse whitespace so line wrapping in the source does not matter.
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
    for (const phrase of phrases) {
      expect(text, `missing space before or after a link: "${phrase}"`).toContain(phrase)
    }
  })
}

test('multi-line paper titles fill each line before wrapping', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  const lines = await page.locator('.paper h3').evaluateAll((headings) =>
    headings.map((h) => {
      // Each client rect of a range over the text is one rendered line box.
      const range = document.createRange()
      range.selectNodeContents(h)
      const rects = [...range.getClientRects()].filter((r) => r.width > 1)
      return {
        text: (h.textContent ?? '').slice(0, 45),
        container: h.clientWidth,
        firstLine: rects.length ? Math.round(rects[0].width) : 0,
        count: rects.length,
      }
    }),
  )

  for (const line of lines) {
    if (line.count < 2) continue // single-line titles cannot be short-broken
    const fill = line.firstLine / line.container
    // Measured first-line fill across all multi-line titles:
    //   balance  57-66%   (the bug: half-empty lines, mid-phrase breaks)
    //   pretty   77-96%   (the low end is orphan avoidance doing its job)
    // The threshold sits in the gap. Font metrics differ between macOS and the
    // Linux CI runner, so it must not hug either range.
    expect(
      fill,
      `"${line.text}..." first line fills only ${Math.round(fill * 100)}%, which suggests balancing came back`,
    ).toBeGreaterThan(0.72)
  }
})

test('no word is glued to the start of a link anywhere', async ({ page }) => {
  for (const path of ['/', '/misc/', '/news/']) {
    await page.goto(path)
    const glued = await page.locator('main').evaluate((main) => {
      const bad: string[] = []
      for (const anchor of main.querySelectorAll('a')) {
        const previous = anchor.previousSibling
        if (previous?.nodeType !== Node.TEXT_NODE) continue
        const before = previous.textContent ?? ''
        // A letter or digit immediately before the link, with no space.
        if (/[\w),.]$/.test(before) && !/\s$/.test(before)) {
          bad.push(`${before.slice(-25)}|${anchor.textContent?.slice(0, 25)}`)
        }
      }
      return bad
    })
    expect(glued, `on ${path}`).toEqual([])
  }
})
