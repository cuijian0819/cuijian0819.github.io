import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/** Counted from the bib, not hardcoded: adding a paper should not fail a test. */
const source = readFileSync('_bibliography/papers.bib', 'utf8')
const count = (pattern: RegExp) => (source.match(pattern) ?? []).length
const papers = count(/^@\w+\{/gm)
const awards = count(/^\s*award\s*=/gm)

test('lists every paper in the bibliography on the homepage', async ({ page }) => {
  expect(papers).toBeGreaterThan(0)
  await page.goto('/')
  await expect(page.locator('.paper')).toHaveCount(papers)
})

test('has the anchor /publications/ redirects to', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#papers')).toHaveCount(1)
})

test('marks Jian Cui in every author list', async ({ page }) => {
  await page.goto('/')
  const selves = page.locator('.authors .self')
  expect(await selves.count()).toBe(papers)
  for (const text of await selves.allTextContents()) {
    expect(text).toMatch(/^Jian Cui\*?$/)
  }
})

test('renders media links as real anchors, not escaped text', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.media a', { hasText: 'The Wall Street Journal' })).toHaveCount(1)
  await expect(page.locator('.media a', { hasText: 'Dark Reading' })).toHaveCount(1)
  await expect(page.getByText('¡a href')).toHaveCount(0)
})

test('keeps paper titles in title case', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.locator('.paper h3', { hasText: 'Non-Linguistic Elements' }),
  ).toHaveCount(1)
})

test('shows awards on the papers that have them', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paper .award')).toHaveCount(awards)
  await expect(page.locator('.award', { hasText: 'Distinguished Paper Award' })).toHaveCount(1)
})

// A preprint badge is outlined, not filled, so it cannot be read as an accepted venue.
test('outlines the preprint badges', async ({ page }) => {
  await page.goto('/')
  const preprints = page.locator('.paper .venue.preprint')
  await expect(preprints).toHaveCount(count(/^\s*abbr\s*=\s*\{arXiv/gm))
  await expect(preprints.first()).toHaveText(/arXiv 20\d\d/)
})

// Press coverage was a grey footnote below the pdf links. It now leads them and is
// set in ink, not --muted, because it is the signal a non-specialist recognises.
test('weights press coverage above the pdf links', async ({ page }) => {
  await page.goto('/')
  const paper = page.locator('.paper', { has: page.locator('.media') }).first()
  const media = await paper.locator('.media').boundingBox()
  const meta = await paper.locator('.meta').boundingBox()
  expect(media!.y).toBeLessThan(meta!.y)

  const colors = await paper.evaluate((el) => ({
    outlet: getComputedStyle(el.querySelector('.outlets a')!).color,
    authors: getComputedStyle(el.querySelector('.authors')!).color,
  }))
  expect(colors.outlet).not.toBe(colors.authors)
})

test('orders papers newest first', async ({ page }) => {
  await page.goto('/')
  const venues = await page.locator('.paper .venue').allTextContents()
  const years = venues.map((v) => Number(v.trim().slice(-4)))
  expect(years).toEqual([...years].sort((a, b) => b - a))
  expect(years[0]).toBe(2026)
})
