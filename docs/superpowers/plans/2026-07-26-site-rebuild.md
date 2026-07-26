# Site rebuild implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the al-folio Jekyll fork with a custom Astro site that has warm editorial-serif styling, publications folded into the homepage, and a real mobile-first responsive system, preserving every live URL and the robots.txt research apparatus.

**Architecture:** Astro static build at the repo root. `_bibliography/papers.bib` stays the source of truth for publications, parsed at build time into typed objects by `@retorquere/bibtex-parser`. News moves to an Astro content collection. Jekyll files are deleted only in the final task, so the current site stays buildable until the replacement is verified.

**Tech Stack:** Astro 7, TypeScript, `@retorquere/bibtex-parser` 10, Vitest (unit), Playwright (e2e), GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-07-25-site-rebuild-design.md`

## Global constraints

- **Never 404 a live URL.** `/publications/`, `/cv/`, `/blog/`, `/projects/` must redirect, not disappear.
- **The honeypot is load-bearing.** `robots.txt` (permissive), `sitemap.xml` (exactly one URL, `/realme`), `/realme/`, `/real_me/`, and the hidden block in the homepage bio must survive byte-equivalent in intent. Hidden text color must track the new paper color or the false persona becomes visible.
- **Palette, light / dark:** paper `#FBF8F3` / `#1A1815`, raised `#FFFDFA` / `#232019`, ink `#33302B` / `#EDE7DE`, muted `#7A736A` / `#9C9287`, accent `#B5654A` / `#E08B6B`, rule `rgba(51,48,43,0.10)` / `rgba(237,231,222,0.12)`.
- **`#007aff` must not appear anywhere in the final CSS.**
- **Fonts:** Fraunces (display), Literata (body). Self-hosted woff2 in `public/fonts/`. No third-party font requests.
- **Breakpoints: 640px and 1024px only.** Type is fluid via `clamp()` between them.
- **No horizontal page scroll at 320px. No inner scroll regions anywhere.**
- **Body leading 1.75, measure capped at 68ch.**
- `@retorquere/bibtex-parser` must be imported as ESM. Its CJS entry has broken transitive resolution under Node 25.
- Parser options are exactly `{ sentenceCase: false, verbatimFields: ['media', 'pdf', 'code', 'url'] }`. Omitting `sentenceCase: false` lowercases paper titles. Omitting `verbatimFields` mangles `<` to `¡` and destroys the HTML links in `media`.

---

## File structure

| Path | Responsibility |
|---|---|
| `astro.config.mjs` | site URL, redirects, integrations |
| `src/lib/bibliography.ts` | parse `papers.bib` → `Paper[]`; the only place bibtex is understood |
| `src/lib/bibliography.types.ts` | `Paper`, `Author` types |
| `src/styles/tokens.css` | palette, type scale, spacing; both themes |
| `src/styles/global.css` | element defaults, measure, leading |
| `src/layouts/Base.astro` | html shell, head, nav, footer, theme toggle |
| `src/components/SEO.astro` | OG, Twitter card, schema.org |
| `src/components/PaperEntry.astro` | one publication |
| `src/components/NewsList.astro` | news items, `limit` prop |
| `src/components/OpenResults.astro` | CrossFit table, stacks below 640px |
| `src/components/ThemeToggle.astro` | the only client JS |
| `src/content/news/*.md` | migrated from `_news/` |
| `src/pages/*.astro` | one file per route |
| `public/assets/**` | pdfs, publication previews, verbatim URLs |
| `public/fonts/*.woff2` | self-hosted faces |
| `public/robots.txt`, `public/sitemap.xml` | honeypot apparatus, copied verbatim |
| `tests/unit/*.test.ts` | Vitest |
| `tests/e2e/*.spec.ts` | Playwright |

---

### Task 1: Astro scaffold, test harness, CI

**Files:**
- Create: `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/astro.yml`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `npm run build` emits to `dist/`; `npm run test:unit`; `npm run test:e2e`

- [ ] **Step 1: Install dependencies**

The existing `package.json` already has `prettier` and `@shopify/prettier-plugin-liquid` as devDependencies. Keep prettier, drop the liquid plugin at the end (Task 12), and add:

```bash
npm i astro@^7
npm i -D vitest @playwright/test typescript
npm i @retorquere/bibtex-parser@^10 tslib
npx playwright install chromium
```

`tslib` is a required peer of the parser and is not installed automatically.

- [ ] **Step 2: Add scripts to `package.json`**

```json
{
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

`"type": "module"` is required; the parser is ESM-only.

- [ ] **Step 3: Write `astro.config.mjs`**

Redirects are declared here so Task 11 only has to verify them.

```js
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://cuijian0819.github.io',
  redirects: {
    '/publications': '/#publications',
    '/publications/': '/#publications',
    '/cv': '/assets/pdf/CV_Jian.pdf',
    '/cv/': '/assets/pdf/CV_Jian.pdf',
    '/blog': '/',
    '/blog/': '/',
    '/projects': '/',
    '/projects/': '/',
  },
})
```

- [ ] **Step 4: Write `vitest.config.ts` and `playwright.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'] },
})
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://localhost:4321' },
})
```

- [ ] **Step 5: Add `dist/` and `.astro/` to `.gitignore`**

- [ ] **Step 6: Verify the scaffold builds**

Run: `npm run build`
Expected: exits 0, `dist/` created.

- [ ] **Step 7: Write the CI workflow**

Create `.github/workflows/astro.yml`. Do **not** delete the existing Jekyll workflows yet; Task 12 does that. Set this one to `workflow_dispatch` only for now so two workflows do not race to deploy.

```yaml
name: astro
on:
  workflow_dispatch:
  pull_request:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:unit
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "build: scaffold Astro alongside Jekyll with vitest and playwright"
```

---

### Task 2: Bibliography parser

The highest-risk unit in the build. `papers.bib` mixes three author formats, embeds `*` inside surnames, stores raw HTML in `media`, and stores `pdf` as either a bare filename or a full URL.

**Files:**
- Create: `src/lib/bibliography.types.ts`, `src/lib/bibliography.ts`
- Test: `tests/unit/bibliography.test.ts`

**Interfaces:**
- Consumes: `_bibliography/papers.bib`
- Produces:
  - `type Author = { first: string; last: string; isSelf: boolean; display: string }`
  - `type Paper = { key: string; title: string; authors: Author[]; year: number; venue: string; venueFull: string; award?: string; mediaHtml?: string; pdfUrl?: string; codeUrl?: string }`
  - `function loadPapers(bibPath: string): Paper[]` — returns papers sorted year-descending, ties in file order.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/bibliography.test.ts
import { describe, expect, it } from 'vitest'
import { loadPapers } from '../../src/lib/bibliography'

const papers = loadPapers('_bibliography/papers.bib')
const byKey = (k: string) => papers.find(p => p.key === k)!

describe('loadPapers', () => {
  it('parses every entry', () => {
    expect(papers).toHaveLength(9)
  })

  it('sorts year-descending, ties in file order', () => {
    expect(papers.map(p => p.year)).toEqual([2026, 2025, 2025, 2024, 2024, 2024, 2023, 2022, 2022])
    expect(papers[0].key).toBe('li2025dissonances')
    expect(papers[1].key).toBe('cui2025doyssey')
  })

  it('preserves title case', () => {
    // Regression: the parser sentence-cases titles unless sentenceCase:false.
    expect(byKey('jang2024cybertuned').title).toContain('Non-Linguistic Elements')
    expect(byKey('li2025dissonances').title).toBe(
      'Les Dissonances: Cross-Tool Harvesting and Polluting in Multi-Tool Empowered LLM Agents',
    )
  })

  it('unescapes LaTeX in venue names', () => {
    expect(byKey('cui2022meta').venueFull).toContain('Information & Knowledge Management')
  })

  it('handles "Last*, First" author format', () => {
    const a = byKey('li2025dissonances').authors
    expect(a[0].display).toBe('Zichuan Li*')
    expect(a[1].display).toBe('Jian Cui*')
    expect(a[1].isSelf).toBe(true)
    expect(a[0].isSelf).toBe(false)
  })

  it('handles "First Last*" author format', () => {
    const a = byKey('cui2025doyssey').authors
    expect(a[0].display).toBe('Jian Cui*')
    expect(a[0].isSelf).toBe(true)
    expect(a[1].display).toBe('MingMing Zha*')
  })

  it('handles multiline quoted authors', () => {
    const a = byKey('jin-etal-2023-darkbert').authors
    expect(a[2].display).toBe('Jian Cui')
    expect(a[2].isSelf).toBe(true)
  })

  it('resolves bare pdf filenames against /assets/pdf/', () => {
    expect(byKey('cui2025doyssey').pdfUrl).toBe('/assets/pdf/llmbot_compliance.pdf')
  })

  it('passes through absolute pdf URLs unchanged', () => {
    expect(byKey('cui2024tweezers').pdfUrl).toBe('https://arxiv.org/pdf/2409.08221')
  })

  it('leaves codeUrl undefined when absent', () => {
    expect(byKey('kim2023drainclog').codeUrl).toBeUndefined()
    expect(byKey('park2022mecanic').codeUrl).toBeUndefined()
  })

  it('preserves raw HTML in media', () => {
    // Regression: without verbatimFields the parser turns "<" into "¡".
    const html = byKey('lin2024malla').mediaHtml!
    expect(html).toContain('<a href="https://www.wsj.com')
    expect(html).not.toContain('¡')
  })

  it('exposes awards on the three entries that have them', () => {
    expect(byKey('cui2025doyssey').award).toBe('Distinguished Paper Award')
    expect(papers.filter(p => p.award)).toHaveLength(3)
  })

  it('renders venue as short name plus year', () => {
    expect(byKey('li2025dissonances').venue).toBe('NDSS 2026')
    expect(byKey('lin2024malla').venue).toBe('USENIX Security 2024')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit`
Expected: FAIL, cannot resolve `src/lib/bibliography`.

- [ ] **Step 3: Write the types**

```ts
// src/lib/bibliography.types.ts
export type Author = {
  first: string
  last: string
  isSelf: boolean
  display: string
}

export type Paper = {
  key: string
  title: string
  authors: Author[]
  year: number
  venue: string
  venueFull: string
  award?: string
  mediaHtml?: string
  pdfUrl?: string
  codeUrl?: string
}
```

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/bibliography.ts
import { parse } from '@retorquere/bibtex-parser'
import fs from 'node:fs'
import type { Author, Paper } from './bibliography.types'

// Short forms whose abbr prefix is ambiguous on its own.
const VENUE_NAMES: Record<string, string> = {
  Security: 'USENIX Security',
}

const SELF = { first: 'Jian', last: 'Cui' }

/** Surnames carry equal-contribution asterisks, e.g. "Cui*". Strip for comparison, keep for display. */
function toAuthor(raw: { firstName?: string; lastName?: string }): Author {
  const first = raw.firstName ?? ''
  const last = raw.lastName ?? ''
  const bareLast = last.replace(/\*/g, '')
  return {
    first,
    last,
    isSelf: bareLast === SELF.last && first === SELF.first,
    display: [first, last].filter(Boolean).join(' '),
  }
}

/** `pdf` is either a bare filename living in assets/pdf, or an absolute URL. */
function resolvePdf(value?: string): string | undefined {
  if (!value) return undefined
  return value.includes('://') ? value : `/assets/pdf/${value}`
}

function toVenue(abbr: string | undefined, year: number): string {
  if (!abbr) return String(year)
  const short = abbr.split("'")[0]
  return `${VENUE_NAMES[short] ?? short} ${year}`
}

export function loadPapers(bibPath: string): Paper[] {
  const source = fs.readFileSync(bibPath, 'utf8')

  // sentenceCase:false keeps title capitalisation.
  // verbatimFields stops the LaTeX-to-unicode pass mangling "<" in the media HTML.
  const bib = parse(source, {
    sentenceCase: false,
    verbatimFields: ['media', 'pdf', 'code', 'url'],
  })

  const papers = bib.entries.map((entry): Paper => {
    const f = entry.fields as Record<string, any>
    const year = Number(f.year)
    return {
      key: entry.key,
      title: f.title,
      authors: (f.author ?? []).map(toAuthor),
      year,
      venue: toVenue(f.abbr, year),
      venueFull: f.journal ?? '',
      award: f.award || undefined,
      mediaHtml: f.media || undefined,
      pdfUrl: resolvePdf(f.pdf),
      codeUrl: f.code || undefined,
    }
  })

  // Stable sort: Array.prototype.sort is stable, so equal years keep file order.
  return papers.sort((a, b) => b.year - a.year)
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:unit`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib tests/unit/bibliography.test.ts
git commit -m "feat: parse papers.bib into typed Paper objects"
```

---

### Task 3: Design tokens and self-hosted fonts

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `public/fonts/*.woff2`
- Test: `tests/unit/tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--paper`, `--raised`, `--ink`, `--muted`, `--accent`, `--rule`, `--font-display`, `--font-body`, `--step--1` through `--step-4`, `--measure`.

- [ ] **Step 1: Download the fonts**

Fetch the variable woff2 for Fraunces and Literata from Google Fonts and place them at `public/fonts/fraunces.woff2` and `public/fonts/literata.woff2`. Both are OFL-licensed. Include the license text at `public/fonts/OFL.txt`.

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/tokens.test.ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

const css = fs.readFileSync('src/styles/tokens.css', 'utf8')

describe('design tokens', () => {
  it('defines both themes', () => {
    expect(css).toMatch(/:root\s*\{/)
    expect(css).toMatch(/\[data-theme=["']dark["']\]/)
  })

  it('uses the approved warm palette', () => {
    for (const hex of ['#FBF8F3', '#1A1815', '#33302B', '#EDE7DE', '#B5654A', '#E08B6B']) {
      expect(css).toContain(hex)
    }
  })

  it('contains no trace of the old Apple blue', () => {
    expect(css.toLowerCase()).not.toContain('007aff')
  })

  it('scales type fluidly rather than at breakpoints', () => {
    expect(css).toContain('clamp(')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:unit`
Expected: FAIL, `src/styles/tokens.css` does not exist.

- [ ] **Step 4: Write `src/styles/tokens.css`**

```css
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/fraunces.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: 'Literata';
  src: url('/fonts/literata.woff2') format('woff2-variations');
  font-weight: 200 900;
  font-display: swap;
}

:root {
  --paper: #FBF8F3;
  --raised: #FFFDFA;
  --ink: #33302B;
  --muted: #7A736A;
  --accent: #B5654A;
  --rule: rgba(51, 48, 43, 0.10);

  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Literata', Georgia, serif;

  /* Fluid scale: min at 320px, max at 1024px. */
  --step--1: clamp(0.83rem, 0.80rem + 0.15vw, 0.92rem);
  --step-0:  clamp(1.00rem, 0.94rem + 0.28vw, 1.13rem);
  --step-1:  clamp(1.20rem, 1.10rem + 0.50vw, 1.45rem);
  --step-2:  clamp(1.44rem, 1.28rem + 0.80vw, 1.85rem);
  --step-3:  clamp(1.73rem, 1.48rem + 1.25vw, 2.37rem);
  --step-4:  clamp(2.00rem, 1.45rem + 2.75vw, 3.50rem);

  --measure: 68ch;
  --leading: 1.75;
  --radius: 12px;
}

[data-theme='dark'] {
  --paper: #1A1815;
  --raised: #232019;
  --ink: #EDE7DE;
  --muted: #9C9287;
  --accent: #E08B6B;
  --rule: rgba(237, 231, 222, 0.12);
}
```

- [ ] **Step 5: Write `src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; }

html { color-scheme: light dark; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--step-0);
  line-height: var(--leading);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-variation-settings: 'SOFT' 60, 'WONK' 0;
  line-height: 1.15;
  margin: 0 0 0.5em;
}

h1 { font-size: var(--step-4); }
h2 { font-size: var(--step-2); }
h3 { font-size: var(--step-1); }

a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }

hr { border: 0; border-top: 1px solid var(--rule); margin: 2.5rem 0; }

img { max-width: 100%; height: auto; }

/* Every interactive target clears 44px on touch. */
a, button { min-height: 44px; display: inline-flex; align-items: center; }

.prose { max-width: var(--measure); }
```

`font-variation-settings: 'SOFT' 60` is the axis that makes Fraunces soft rather than sharp. It is the literal implementation of the "soft and warm" requirement.

- [ ] **Step 6: Run to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/styles public/fonts
git commit -m "feat: warm editorial design tokens with self-hosted Fraunces and Literata"
```

---

### Task 4: Base layout, navigation, theme toggle

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/ThemeToggle.astro`, `src/components/SEO.astro`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `src/styles/*`
- Produces: `Base.astro` accepting props `{ title: string; description: string; ogImage?: string }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/layout.spec.ts
import { expect, test } from '@playwright/test'

test('navigation is inline with no hamburger at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  await expect(page.locator('nav a')).toHaveCount(4)
  await expect(page.locator('button.hamburger, .navbar-toggler')).toHaveCount(0)
})

test('theme toggle flips the paper colour', async ({ page }) => {
  await page.goto('/')
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const light = await bg()
  await page.getByRole('button', { name: /theme/i }).click()
  expect(await bg()).not.toBe(light)
})

test('ships no framework JS bundle', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()) })
  await page.goto('/')
  expect(scripts.join(' ')).not.toMatch(/jquery|bootstrap/i)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e`
Expected: FAIL, no pages exist yet.

- [ ] **Step 3: Write `src/components/ThemeToggle.astro`**

The only client JS on the site. Inline, no framework.

```astro
<button id="theme-toggle" aria-label="Toggle theme">☾</button>

<script is:inline>
  const key = 'theme'
  const saved = localStorage.getItem(key)
  if (saved) document.documentElement.dataset.theme = saved
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem(key, next)
  })
</script>
```

- [ ] **Step 4: Write `src/components/SEO.astro`**

```astro
---
interface Props { title: string; description: string; ogImage?: string }
const { title, description, ogImage = '/assets/img/profile_photo.png' } = Astro.props
const url = new URL(Astro.url.pathname, Astro.site).href
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={url} />
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={new URL(ogImage, Astro.site).href} />
<meta property="og:url" content={url} />
<meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 5: Write `src/layouts/Base.astro`**

```astro
---
import SEO from '../components/SEO.astro'
import ThemeToggle from '../components/ThemeToggle.astro'
import '../styles/tokens.css'
import '../styles/global.css'

interface Props { title: string; description: string }
const { title, description } = Astro.props

const nav = [
  { href: '/', label: 'about' },
  { href: '/#publications', label: 'work' },
  { href: '/misc/', label: 'misc' },
  { href: '/writing/', label: 'writing' },
]
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preload" href="/fonts/literata.woff2" as="font" type="font/woff2" crossorigin />
    <SEO title={title} description={description} />
  </head>
  <body>
    <header class="masthead">
      <a class="wordmark" href="/">Jian Cui</a>
      <nav>{nav.map(i => <a href={i.href}>{i.label}</a>)}</nav>
      <ThemeToggle />
    </header>
    <main><slot /></main>
    <footer><p>© 2026 Jian Cui</p></footer>
  </body>
</html>

<style>
  .masthead {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .wordmark { font-family: var(--font-display); font-size: var(--step-1); margin-right: auto; }
  nav { display: flex; gap: 1.25rem; }
  body > * { padding-inline: clamp(1rem, 5vw, 2rem); }
  main { max-width: calc(var(--measure) + 12rem); margin: 0 auto; }
</style>
```

Note the footer no longer credits al-folio.

- [ ] **Step 6: Run to verify the layout tests pass**

They will still fail until Task 6 creates `/`. Defer the run to Task 6, Step 6.

- [ ] **Step 7: Commit**

```bash
git add src/layouts src/components tests/e2e/layout.spec.ts
git commit -m "feat: base layout with inline nav and theme toggle"
```

---

### Task 5: PaperEntry component

**Files:**
- Create: `src/components/PaperEntry.astro`
- Test: `tests/e2e/publications.spec.ts` (assertions run in Task 6)

**Interfaces:**
- Consumes: `Paper` from `src/lib/bibliography.types`
- Produces: `<PaperEntry paper={p} />`

- [ ] **Step 1: Write the component**

```astro
---
import type { Paper } from '../lib/bibliography.types'
interface Props { paper: Paper }
const { paper } = Astro.props
---
<article class="paper">
  <h3>{paper.title}</h3>
  <p class="authors">
    {paper.authors.map((a, i) => (
      <>
        {i > 0 && ', '}
        <span class={a.isSelf ? 'self' : undefined}>{a.display}</span>
      </>
    ))}
  </p>
  <p class="meta">
    <span class="venue" title={paper.venueFull}>{paper.venue}</span>
    {paper.award && <> · <span class="award">★ {paper.award}</span></>}
    {paper.pdfUrl && <> · <a href={paper.pdfUrl}>pdf</a></>}
    {paper.codeUrl && <> · <a href={paper.codeUrl}>code</a></>}
  </p>
  {paper.mediaHtml && (
    <p class="media"><span>Media:</span> <Fragment set:html={paper.mediaHtml} /></p>
  )}
</article>

<style>
  .paper { margin: 0 0 2.25rem; max-width: var(--measure); }
  .paper h3 { font-size: var(--step-1); margin-bottom: 0.35rem; }
  .authors { margin: 0 0 0.3rem; color: var(--muted); font-size: var(--step--1); }
  .authors .self { color: var(--ink); font-weight: 600; }
  .meta { margin: 0; font-size: var(--step--1); }
  .venue { font-variant-caps: all-small-caps; letter-spacing: 0.04em; }
  .award { color: var(--accent); }
  .media { margin: 0.3rem 0 0; font-size: var(--step--1); color: var(--muted); }
</style>
```

`<Fragment set:html>` is required for `mediaHtml` because that field holds raw anchor tags from the bib file.

- [ ] **Step 2: Commit**

```bash
git add src/components/PaperEntry.astro
git commit -m "feat: publication entry component"
```

---

### Task 6: Homepage

**Files:**
- Create: `src/pages/index.astro`
- Test: `tests/e2e/publications.spec.ts`

**Interfaces:**
- Consumes: `loadPapers`, `PaperEntry`, `NewsList` (Task 7 — build the homepage without news first, add the include in Task 7)

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/publications.spec.ts
import { expect, test } from '@playwright/test'

test('lists all nine papers on the homepage', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paper')).toHaveCount(9)
})

test('has the anchor /publications/ redirects to', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#publications')).toHaveCount(1)
})

test('marks Jian Cui in every author list he appears in', async ({ page }) => {
  await page.goto('/')
  const selves = page.locator('.authors .self')
  expect(await selves.count()).toBe(9)
  for (const t of await selves.allTextContents()) expect(t).toMatch(/^Jian Cui\*?$/)
})

test('renders media links as real anchors, not escaped text', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.media a', { hasText: 'The Wall Street Journal' })).toHaveCount(1)
  await expect(page.getByText('¡a href')).toHaveCount(0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- publications`
Expected: FAIL, no homepage.

- [ ] **Step 3: Move the profile photo into `src/assets/`**

```bash
mkdir -p src/assets
cp assets/img/profile_photo.png src/assets/profile_photo.png
```

It goes in `src/assets/` rather than `public/` so `astro:assets` optimises it.

- [ ] **Step 4: Write `src/pages/index.astro`**

```astro
---
import { Image } from 'astro:assets'
import Base from '../layouts/Base.astro'
import PaperEntry from '../components/PaperEntry.astro'
import { loadPapers } from '../lib/bibliography'
import profile from '../assets/profile_photo.png'

const papers = loadPapers('_bibliography/papers.bib')
---
<Base
  title="Jian Cui"
  description="Jian Cui is a PhD candidate at the University of Illinois Urbana-Champaign working on security and privacy in agentic AI systems and AI for cyber threat intelligence."
>
  <section class="intro">
    <div class="bio prose">
      <h1>Jian Cui</h1>
      <p>
        I'm a PhD student at the University of Illinois Urbana-Champaign, advised by
        <a href="https://xiaojingliao.com">Xiaojing Liao</a>. Before that I earned my bachelor's and
        master's in EE from <a href="https://kaist.ac.kr/en/">KAIST</a>, advised by
        <a href="https://nss.kaist.ac.kr">Seungwon Shin</a>.
      </p>
      <p>
        My research addresses security and privacy threats in agentic AI systems, and applies AI to
        cyber threat intelligence: security event detection, dark web analysis, and phishing detection.
      </p>
      <p class="links">
        <a href="/assets/pdf/CV_Jian.pdf">CV</a> ·
        <a href="https://scholar.google.com/citations?user=eepEd2kAAAAJ&hl=en">Google Scholar</a>
      </p>
    </div>
    <Image class="portrait" src={profile} alt="Jian Cui" widths={[320, 640]} sizes="(min-width: 640px) 320px, 60vw" />
  </section>

  <section id="publications">
    <h2>Publications</h2>
    {papers.map(p => <PaperEntry paper={p} />)}
  </section>
</Base>

<style>
  .intro { display: grid; gap: 2rem; margin: 3rem 0; }
  .portrait { border-radius: var(--radius); justify-self: start; }
  #publications { margin-top: 4rem; }

  /* Below 640px the photo stacks above the bio; above, it offsets right. */
  @media (min-width: 640px) {
    .intro { grid-template-columns: 1fr auto; align-items: start; }
    .bio { grid-column: 1; grid-row: 1; }
    .portrait { grid-column: 2; grid-row: 1; width: 260px; }
  }
</style>
```

- [ ] **Step 5: Run the publications tests**

Run: `npm run test:e2e -- publications`
Expected: PASS, 4 tests.

- [ ] **Step 6: Run the layout tests deferred from Task 4**

Run: `npm run test:e2e -- layout`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro src/assets tests/e2e/publications.spec.ts
git commit -m "feat: homepage with bio and all nine publications"
```

---

### Task 7: News collection and /news/

**Files:**
- Create: `src/content.config.ts`, `src/content/news/*.md`, `src/components/NewsList.astro`, `src/pages/news.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/news.spec.ts`

**Interfaces:**
- Produces: `<NewsList limit={5} />`

- [ ] **Step 1: Migrate the news files**

```bash
mkdir -p src/content/news
cp _news/announcement_*.md src/content/news/
```

Then strip the Jekyll-only front matter keys from each file, leaving only `date`. Remove `layout`, `inline`, and `related_posts`. There are 13 files.

- [ ] **Step 2: Write the failing test**

```ts
// tests/e2e/news.spec.ts
import { expect, test } from '@playwright/test'

test('homepage shows the five most recent items with no inner scrollbar', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.news-item')).toHaveCount(5)
  const overflow = await page.locator('.news').evaluate(el => getComputedStyle(el).overflowY)
  expect(overflow).not.toBe('auto')
  expect(overflow).not.toBe('scroll')
})

test('/news/ lists all thirteen', async ({ page }) => {
  await page.goto('/news/')
  await expect(page.locator('.news-item')).toHaveCount(13)
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:e2e -- news`
Expected: FAIL.

- [ ] **Step 4: Define the collection**

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: z.object({ date: z.coerce.date() }),
})

export const collections = { news }
```

- [ ] **Step 5: Write `NewsList.astro`**

Definition list rather than a table, so it reflows on narrow screens instead of forcing a fixed date column.

```astro
---
import { getCollection, render } from 'astro:content'
interface Props { limit?: number }
const { limit } = Astro.props
const items = (await getCollection('news')).sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
)
const shown = limit ? items.slice(0, limit) : items
---
<div class="news">
  {await Promise.all(shown.map(async item => {
    const { Content } = await render(item)
    return (
      <div class="news-item">
        <time datetime={item.data.date.toISOString()}>
          {item.data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </time>
        <div class="body"><Content /></div>
      </div>
    )
  }))}
</div>

<style>
  .news-item { padding: 0.6rem 0; border-bottom: 1px solid var(--rule); }
  .news-item time { display: block; color: var(--muted); font-size: var(--step--1); }
  .news-item :global(p) { margin: 0.2rem 0 0; }
  @media (min-width: 640px) {
    .news-item { display: grid; grid-template-columns: 8.5rem 1fr; gap: 1rem; }
    .news-item time { padding-top: 0.1rem; }
  }
</style>
```

- [ ] **Step 6: Add news to the homepage and create `/news/`**

In `src/pages/index.astro`, import `NewsList` and insert before `#publications`:

```astro
<section class="news-section">
  <h2><a href="/news/">News</a></h2>
  <NewsList limit={5} />
</section>
```

Create `src/pages/news.astro` rendering `<NewsList />` with no limit, inside `Base`.

- [ ] **Step 7: Run to verify it passes**

Run: `npm run test:e2e -- news`
Expected: PASS, 2 tests.

- [ ] **Step 8: Commit**

```bash
git add src/content.config.ts src/content src/components/NewsList.astro src/pages/news.astro src/pages/index.astro tests/e2e/news.spec.ts
git commit -m "feat: news collection with reflowing list instead of fixed-column table"
```

---

### Task 8: /misc/ and the responsive CrossFit table

The only genuinely custom responsive component. The source table is 4 columns with 150+ character descriptions and no wrapper; it overflows on phones today.

**Files:**
- Create: `src/components/OpenResults.astro`, `src/pages/misc.astro`
- Test: `tests/e2e/responsive.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/responsive.spec.ts
import { expect, test } from '@playwright/test'

const PAGES = ['/', '/misc/', '/writing/', '/news/']

for (const path of PAGES) {
  test(`no horizontal overflow at 320px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(path)
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
}

test('open results stack below 640px and tabulate above', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/misc/')
  await expect(page.locator('.open-results .row-card').first()).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(page.locator('.open-results table')).toBeVisible()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- responsive`
Expected: FAIL.

- [ ] **Step 3: Write `OpenResults.astro`**

Render the data once and switch presentation with CSS, so there is no duplicated markup to drift.

```astro
---
interface Row { workout: string; description: string; score: string; result: string }
interface Props { rows: Row[] }
const { rows } = Astro.props
---
<div class="open-results">
  <table>
    <thead>
      <tr><th>Workout</th><th>Description</th><th>Score</th><th>My result</th></tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr>
          <td data-label="Workout"><b>{r.workout}</b></td>
          <td data-label="Description">{r.description}</td>
          <td data-label="Score">{r.score}</td>
          <td data-label="My result">{r.result}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<style>
  .open-results table { width: 100%; border-collapse: collapse; }
  .open-results td, .open-results th { text-align: left; vertical-align: top; padding: 0.5rem 0.75rem 0.5rem 0; }
  .open-results thead th { border-bottom: 1px solid var(--rule); font-size: var(--step--1); color: var(--muted); }

  @media (max-width: 639px) {
    .open-results thead { display: none; }
    .open-results table, .open-results tbody { display: block; }
    .open-results tr {
      display: block;
      padding: 0.9rem 0;
      border-bottom: 1px solid var(--rule);
    }
    .open-results td { display: block; padding: 0; }
    .open-results td[data-label='Description'] { margin: 0.4rem 0; }
    .open-results td[data-label='Score'],
    .open-results td[data-label='My result'] { font-size: var(--step--1); }
    .open-results td[data-label='Score']::before,
    .open-results td[data-label='My result']::before {
      content: attr(data-label) '  ';
      color: var(--muted);
    }
  }
</style>
```

Add `class="row-card"` to `tr` so the test can target it:

```astro
<tr class="row-card">
```

- [ ] **Step 4: Write `src/pages/misc.astro`**

Port the prose from `_pages/misc.md` verbatim. Replace the hand-written `<table>` with `<OpenResults rows={...} />`, moving the three 2026 Open rows into a typed array in the frontmatter. Keep the section headings, the fitness timeline, and the personal section. Drop the Font Awesome icons; there is no icon font in the new build. Use text or omit.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:e2e -- responsive`
Expected: `/writing/` overflow test still fails (page does not exist yet). The other four pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/OpenResults.astro src/pages/misc.astro tests/e2e/responsive.spec.ts
git commit -m "feat: misc page with a CrossFit table that stacks on phones"
```

---

### Task 9: /writing/ and 404

**Files:**
- Create: `src/pages/writing.astro`, `src/pages/404.astro`

- [ ] **Step 1: Port `_pages/writing.md`**

The content is 62 lines of markdown with headings, links, and nested lists. Convert to `writing.astro` wrapping the markdown in `<div class="prose">`, or keep it as `src/pages/writing.md` with a layout frontmatter key. Prefer the markdown page; there is no dynamic content.

```md
---
layout: ../layouts/Base.astro
title: Writing
description: Notes on academic writing that resonate with me.
---
```

- [ ] **Step 2: Write `src/pages/404.astro`**

Astro emits `404.html` from this path automatically, matching the current `/404.html` permalink.

- [ ] **Step 3: Run the full responsive suite**

Run: `npm run test:e2e -- responsive`
Expected: PASS, all five tests including `/writing/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/writing.md src/pages/404.astro
git commit -m "feat: writing and 404 pages"
```

---

### Task 10: Honeypot preservation

The single easiest thing to break in this migration. The hidden text works by matching the text colour to the page background. The background is changing from `#fbfbfd` to `#FBF8F3`, so a stale colour makes the false persona visible.

**Files:**
- Create: `src/pages/realme.astro`, `src/pages/real_me.astro`, `public/robots.txt`, `public/sitemap.xml`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/honeypot.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/honeypot.spec.ts
import { expect, test } from '@playwright/test'

const HIDDEN_PAGES = ['/', '/realme/', '/real_me/']

for (const path of HIDDEN_PAGES) {
  test(`hidden text is invisible against the paper colour on ${path}`, async ({ page }) => {
    await page.goto(path)
    const hidden = page.locator('.hidden-note').first()
    await expect(hidden).toHaveCount(1)

    const { colour, background } = await hidden.evaluate(el => ({
      colour: getComputedStyle(el).color,
      background: getComputedStyle(document.body).backgroundColor,
    }))
    expect(colour).toBe(background)
  })

  test(`hidden text stays invisible in dark mode on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    const hidden = page.locator('.hidden-note').first()
    const { colour, background } = await hidden.evaluate(el => ({
      colour: getComputedStyle(el).color,
      background: getComputedStyle(document.body).backgroundColor,
    }))
    expect(colour).toBe(background)
  })
}

test('robots.txt stays permissive and points at the sitemap', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()
  expect(body).toMatch(/User-agent:\s*\*/)
  expect(body).toMatch(/Disallow:\s*$/m)
  expect(body).toContain('Sitemap: https://cuijian0819.github.io/sitemap.xml')
})

test('sitemap advertises exactly one URL', async ({ request }) => {
  const body = await (await request.get('/sitemap.xml')).text()
  expect(body.match(/<loc>/g)).toHaveLength(1)
  expect(body).toContain('<loc>https://cuijian0819.github.io/realme</loc>')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- honeypot`
Expected: FAIL.

- [ ] **Step 3: Add the shared hidden-note style to `global.css`**

Using `var(--paper)` is what makes the dark-mode case pass automatically.

```css
.hidden-note {
  color: var(--paper);
  font-size: 0.2px;
  user-select: none;
}
```

- [ ] **Step 4: Copy robots.txt and sitemap.xml into `public/`**

Strip the Jekyll front matter from `robots.txt`; the body is unchanged.

```
User-agent: *
Disallow:
Sitemap: https://cuijian0819.github.io/sitemap.xml
```

`public/sitemap.xml` is copied byte-for-byte from the existing root `sitemap.xml`. Do **not** add a sitemap integration to `astro.config.mjs`; it would overwrite this file and defeat the apparatus.

- [ ] **Step 5: Port the three hidden blocks**

Move the hidden text from `_pages/about.md` into `index.astro`, and from `_pages/realme.md` and `realme.html` into the two new pages, wrapping each in `<div class="hidden-note">`. Preserve the wording exactly. `/realme/` remains the URL named in the sitemap; `/real_me/` remains the one that is not.

- [ ] **Step 6: Run to verify it passes**

Run: `npm run test:e2e -- honeypot`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add src/pages/realme.astro src/pages/real_me.astro public/robots.txt public/sitemap.xml src/pages/index.astro src/styles/global.css tests/e2e/honeypot.spec.ts
git commit -m "feat: preserve robots.txt honeypot with theme-tracking hidden text"
```

---

### Task 11: Redirects, assets, and SEO verification

**Files:**
- Modify: `public/assets/**`
- Test: `tests/e2e/urls.spec.ts`

- [ ] **Step 1: Copy the preserved assets**

```bash
mkdir -p public/assets
cp -R assets/pdf public/assets/pdf
cp -R assets/img/publication_preview public/assets/img/publication_preview
cp assets/img/profile_photo.png public/assets/img/profile_photo.png
```

`profile_photo.png` is duplicated into `public/` because `SEO.astro` references it as a stable OG image URL, while `src/assets/` holds the optimised copy for the page itself.

- [ ] **Step 2: Write the failing test**

```ts
// tests/e2e/urls.spec.ts
import { expect, test } from '@playwright/test'

const LIVE = ['/', '/misc/', '/writing/', '/news/', '/realme/', '/real_me/']

for (const path of LIVE) {
  test(`${path} returns 200`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(200)
  })
}

test('/publications/ reaches the homepage publications anchor', async ({ page }) => {
  await page.goto('/publications/')
  await page.waitForURL(/#publications$/)
  await expect(page.locator('#publications')).toBeVisible()
})

test('/cv/ reaches the real CV pdf', async ({ page }) => {
  await page.goto('/cv/')
  await page.waitForURL(/CV_Jian\.pdf$/)
})

test('/blog/ and /projects/ reach the homepage', async ({ page }) => {
  for (const path of ['/blog/', '/projects/']) {
    await page.goto(path)
    await page.waitForURL(/\/$/)
  }
})

test('the CV pdf itself is served', async ({ request }) => {
  expect((await request.get('/assets/pdf/CV_Jian.pdf')).status()).toBe(200)
})

test('every paper pdf link resolves', async ({ page, request }) => {
  await page.goto('/')
  const hrefs = await page.locator('.meta a', { hasText: 'pdf' }).evaluateAll(
    els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')!),
  )
  for (const href of hrefs.filter(h => h.startsWith('/'))) {
    expect((await request.get(href)).status()).toBe(200)
  }
})

test('page has Open Graph tags and no al-folio boilerplate', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description).not.toMatch(/whitespace theme|al-folio/i)
})
```

- [ ] **Step 3: Run to verify it fails, then passes**

Run: `npm run test:e2e -- urls`
Expected: initially FAIL on the asset routes; PASS after Step 1 and the redirects from Task 1 are in place.

- [ ] **Step 4: Commit**

```bash
git add public/assets tests/e2e/urls.spec.ts
git commit -m "test: verify every preserved URL, redirect, and pdf resolves"
```

---

### Task 12: Remove Jekyll and cut over

Do this only once every prior task's tests pass. This is the irreversible step.

**Files:**
- Delete: Jekyll tree, dead assets, al-folio docs
- Modify: `.github/workflows/astro.yml`
- Create: `CLAUDE.md` (rewrite)

- [ ] **Step 1: Confirm the full suite is green**

Run: `npm run test:unit && npm run test:e2e`
Expected: PASS, everything.

- [ ] **Step 2: Delete the Jekyll tree**

```bash
git rm -r --quiet _bibliography/../_data _includes _layouts _news _pages _plugins _sass \
  assets/css assets/js assets/webfonts assets/fonts assets/plotly assets/jupyter \
  assets/html assets/json assets/bibliography assets/audio assets/video \
  _config.yml Gemfile Gemfile.lock Dockerfile docker-compose.yml docker-compose-slim.yml \
  purgecss.config.js requirements.txt realme.html robots.txt sitemap.xml \
  README.md INSTALL.md CUSTOMIZE.md FAQ.md CONTRIBUTING.md .all-contributorsrc \
  bin lighthouse_results readme_preview
git rm -r --quiet .github/workflows/deploy.yml .github/workflows/deploy-image.yml \
  .github/workflows/deploy-docker-tag.yml .github/workflows/docker-slim.yml
```

Keep `_bibliography/papers.bib`. It is still the source of truth and `loadPapers` reads it from that path.

- [ ] **Step 3: Delete the dead assets**

All four verified unreferenced, ~54MB:

```bash
git rm --quiet assets/img/profile_photo_original.png assets/img/profile_photo_old.jpeg
```

The two videos are removed by the `assets/video` deletion in Step 2. Note this frees working-tree space only; git history still carries them, so clone size is unchanged.

- [ ] **Step 4: Remove the liquid prettier plugin**

```bash
npm uninstall @shopify/prettier-plugin-liquid
```

- [ ] **Step 5: Enable the deploy trigger**

In `.github/workflows/astro.yml`, replace `workflow_dispatch:` with `push: { branches: [master] }` and add the `deploy` job:

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Set the repository's Pages source to "GitHub Actions" in settings. It currently deploys from the `gh-pages` branch, and that must change or the old site keeps serving.

- [ ] **Step 6: Rewrite `CLAUDE.md`**

The existing untracked `CLAUDE.md` documents the Jekyll stack and is now wrong in almost every particular. Rewrite it for the Astro build: `npm run dev`, the two test commands, the bibliography parser's two mandatory options and why, the honeypot's load-bearing role, and the preserved-URL list.

- [ ] **Step 7: Verify a clean build from scratch**

```bash
rm -rf node_modules dist .astro && npm ci && npm run build && npm run test:unit && npm run test:e2e
```

Expected: all green with no Jekyll files present.

- [ ] **Step 8: Commit and merge**

```bash
git add -A
git commit -m "chore: remove Jekyll and al-folio, cut over to Astro"
```

Merge `site-rebuild` into `master` only after a local `npm run preview` has been eyeballed at 320px, 375px, 768px, and 1440px in both themes.

---

## Verification checklist before merge

- [ ] `npm run test:unit && npm run test:e2e` green
- [ ] No `#007aff` anywhere: `grep -ri "007aff" src public` returns nothing
- [ ] No `al-folio` in shipped output: `grep -ri "al-folio" dist` returns nothing
- [ ] Hidden text invisible in both themes at 320px and 1440px, checked by eye as well as by test
- [ ] `/publications/`, `/cv/`, `/blog/`, `/projects/` all redirect
- [ ] Titles render in title case, not sentence case
- [ ] Media links on the Malla and DarkBERT entries are clickable anchors
- [ ] Pages source switched from `gh-pages` branch to GitHub Actions
