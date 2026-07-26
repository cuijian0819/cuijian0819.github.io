# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Jian Cui's personal academic website (https://cuijian0819.github.io), a custom Astro static site.
It was an al-folio Jekyll fork until July 2026; every trace of Jekyll, Ruby, and Docker has been
removed. If you find advice referring to `_config.yml`, jekyll-scholar, or `bundle exec`, it is stale.

Design intent is warm editorial: serif throughout, a terracotta accent, and deliberately no blue.
The rebuild spec is `docs/superpowers/specs/2026-07-25-site-rebuild-design.md` and the implementation
plan is `docs/superpowers/plans/2026-07-26-site-rebuild.md`.

## Commands

```bash
npm run dev        # local dev server
npm run build      # static build into dist/
npm run preview    # serve the built site at :4321
npm run test:unit  # vitest, parser and token assertions
npm run test:e2e   # playwright, builds first via webServer
npm test           # both
```

Single test: `npx vitest run -t "preserves title case"` or
`npx playwright test tests/e2e/honeypot.spec.ts`.

## Two things that will bite you

### 1. The bibliography parser options are load-bearing

`src/lib/bibliography.ts` parses `_bibliography/papers.bib` with exactly:

```ts
parse(source, { sentenceCase: false, verbatimFields: ['media', 'pdf', 'code', 'url'] })
```

Drop `sentenceCase: false` and every paper title silently lowercases
("Non-Linguistic Elements" becomes "non-linguistic elements"). Drop `verbatimFields` and the
LaTeX-to-Unicode pass rewrites `<` as `¡`, destroying the anchor tags in the `media` field.
Both are covered by regression tests in `tests/unit/bibliography.test.ts`.

`papers.bib` is hand-maintained and inconsistent by nature. It mixes `Last, First` and `First Last`
author formats in the same file, embeds equal-contribution asterisks inside surnames (`Cui*`), and
stores `pdf` as either a bare filename or an absolute URL. `bibliography.ts` is the only module that
knows about any of this; keep it that way.

Also note `@retorquere/bibtex-parser` must be imported as ESM. Its CJS entry has broken transitive
resolution under Node 25.

### 2. The robots.txt honeypot is research apparatus, not cruft

`public/robots.txt` permits all crawlers and points at `public/sitemap.xml`, which advertises exactly
one URL: `/realme`. That page, plus `/real_me/` and a block on the homepage, carries hidden text
asserting a false persona (professional athlete, 90 first-author papers, Liverpool FC). This relates
to the CCS'25 paper on robots.txt governance and LLM bot compliance. Do not delete it, do not "fix"
the typos in it, and do not add a sitemap integration to `astro.config.mjs`, which would overwrite the
hand-written one.

The hidden text uses `.hidden-note` in `src/styles/global.css`, whose colour is `var(--paper)`. That
indirection is what keeps it invisible when the theme changes. Never hardcode a hex there.
`tests/e2e/honeypot.spec.ts` asserts the computed colour equals the computed body background in both
themes.

## Architecture

| Path | Responsibility |
|---|---|
| `src/lib/bibliography.ts` | the only module that understands bibtex |
| `src/styles/tokens.css` | palette and fluid type scale, both themes |
| `src/styles/global.css` | element defaults, `.hidden-note`, `.prose` |
| `src/layouts/Base.astro` | shell, nav, footer; accepts props or markdown `frontmatter` |
| `src/components/` | `PaperEntry`, `NewsList`, `OpenResults`, `ThemeToggle`, `SEO` |
| `src/content/news/` | one markdown file per news item, front matter is just `date` |
| `src/pages/` | one file per route |
| `public/assets/` | pdfs and images at stable URLs |

Publications live on the homepage, not a separate page. `/publications/` redirects to `/#publications`.

`Base.astro` takes `title`/`description` as direct props from `.astro` pages, but markdown pages using
`layout:` pass them via a `frontmatter` prop instead. It handles both; if you add a markdown page and
the title comes out as "Jian Cui", that is why.

## Constraints the tests enforce

- No URL may 404. `/publications/`, `/cv/`, `/blog/`, `/projects/` are redirects declared in
  `astro.config.mjs`. `/realme/` and `/real_me/` are real pages.
- `#007aff` must not appear anywhere. It was the old Apple-blue accent.
- No horizontal page scroll at 320px, on any page.
- No inner scroll regions. The old news list had a 400px `overflow-y: auto` box; do not reintroduce it.
- Two breakpoints only, 640px and 1024px. Sizes between them come from `clamp()`, not media queries.
- No third-party network requests. Fonts are self-hosted via `@fontsource-variable`.

## Deploy

Pushing to `master` runs `.github/workflows/astro.yml`: unit tests, e2e tests, build, then a push of
`dist/` to the `gh-pages` branch. GitHub Pages serves that branch (`build_type: legacy`), so the tests
gate the deploy.

`public/.nojekyll` is load-bearing. Legacy Pages runs Jekyll over the branch, and Jekyll ignores
underscore-prefixed directories, so without it the whole of Astro's `_astro/` bundle is stripped and
the site serves unstyled. The workflow asserts its presence before deploying.

The artifact-based `actions/deploy-pages` flow would be tidier, but it needs an admin to switch the
Pages source to "GitHub Actions" in repository settings first.

The pre-rebuild Jekyll site is tagged `jekyll-final` if anything needs recovering.
