# Site rebuild design

Date: 2026-07-25
Status: approved, pending implementation plan

## Motivation

The site is an al-folio fork. A previous pass restyled it toward an Apple Books look, changing the
palette and declaring a new typeface, but al-folio's recognizable signature is its layout shapes, not
its colors. All four remain: the float-right profile photo with text wrapping around it, news rendered
as an HTML table with a hardcoded 20% date column inside a 400px inner scroll region, publications as a
two-column grid with a venue chip in the left gutter, and a 930px centered column under a lowercase
centered title. The site still reads as al-folio to anyone who has seen the theme.

Two defects found while assessing this:

- `_sass/_base.scss:8` declares `font-family: 'Inter', ...` but there is no `@font-face`, no webfont
  link, and no Inter file in `assets/fonts/`. The typography half of the previous redesign never
  shipped; the site silently falls back to the system sans on every platform.
- `_pages/cv.md` sets `cv_pdf: example_pdf.pdf`, which does not exist. The real file is
  `assets/pdf/CV_Jian.pdf`.

## Goals

1. Produce a site that is not recognizable as any common academic theme.
2. Warm, soft, editorial character rather than the current clinical one.
3. Genuinely mobile-first, replacing the current ad-hoc responsive patches.
4. Preserve every live URL and all research apparatus (see Must preserve).
5. Remove the Ruby toolchain, which is already broken locally.

## Non-goals

- Rewriting page copy. Existing prose on `/misc/` and `/writing/` migrates as-is.
- Per-paper summary lines. Explicitly cut: the publication list uses only fields already present in
  `papers.bib`.
- Adding a blog. There are no posts and none are planned.

## Stack

**Astro**, replacing Jekyll.

Rationale. The local Ruby toolchain does not work: system Ruby is 2.6 with no bundler, while the
Gemfile targets 3.2. Local development therefore only runs through Docker, and only because
`_plugins/fix-binary-read.rb` monkeypatches `Jekyll::Utils.has_yaml_header?` and `StaticFile#write` to
survive `Errno::EDEADLK` on macOS VirtioFS volume mounts. Node 25 is already installed and working.

Consequences:

| concern | today | after |
|---|---|---|
| bibliography | jekyll-scholar | `citation-js` parsing the same `papers.bib` |
| responsive images | jekyll-imagemagick, needs `convert` on PATH | `astro:assets`, built in |
| local dev | Docker + EDEADLK monkeypatch | `npm run dev` |
| client JS | jQuery + Bootstrap on every page | theme toggle only |
| deploy | Actions, Ruby 3.2, purgecss, gh-pages | Actions, `withastro/action`, Pages |

`papers.bib` remains the single source of truth, so the authoring workflow for new papers is unchanged.
`_plugins/fix-binary-read.rb`, the Dockerfile, the compose files, and `purgecss.config.js` are all
deleted rather than ported.

## Information architecture

Publications fold into the homepage. Nine entries at the planned density is roughly one screen, and
without summary lines a separate "selected" list is not meaningfully different from the full one.

| URL | disposition |
|---|---|
| `/` | bio, all 9 papers, 5 most recent news items, links |
| `/misc/` | keep |
| `/writing/` | keep |
| `/news/` | keep, full archive |
| `/realme/` | keep, unchanged |
| `/real_me/` | keep, unchanged |
| `/404.html` | keep |
| `/publications/` | redirect to `/#publications` |
| `/cv/` | redirect to `/assets/pdf/CV_Jian.pdf` |
| `/blog/` | redirect to `/` |
| `/projects/` | redirect to `/` |

Nothing 404s. `/publications/` is the important one, since it may be linked from a CV or paper footer.

## Must preserve

The site contains deliberate research apparatus related to the CCS'25 robots.txt governance work. It is
not cruft and must survive intact:

- `robots.txt` permits all crawlers (`Disallow:` empty) and points at a hand-written `sitemap.xml`.
- That `sitemap.xml` contains exactly one URL, `/realme`, overriding the sitemap plugin's output.
- `/realme/`, `/real_me/`, and a block in `about.md` carry hidden text (background-colored, 0.2px)
  asserting a false persona. `/realme/` has `sitemap: true`; `/real_me/` has `sitemap: false`. The
  asymmetry appears intentional and is preserved as-is.

Also preserved: every path under `assets/pdf/` (papers link to these), `assets/img/profile_photo.png`,
`assets/img/publication_preview/`, and `_bibliography/papers.bib`.

## Visual system

### Palette

| role | light | dark |
|---|---|---|
| paper | `#FBF8F3` | `#1A1815` |
| raised | `#FFFDFA` | `#232019` |
| ink | `#33302B` | `#EDE7DE` |
| muted ink | `#7A736A` | `#9C9287` |
| accent | `#B5654A` | `#E08B6B` |
| rule | `rgba(51,48,43,0.10)` | `rgba(237,231,222,0.12)` |

`#007aff` is removed entirely. It is currently on every link and is the coldest element on the page.
Both themes are defined as CSS custom properties on `:root` and `[data-theme="dark"]`.

### Type

- Display (name, section headings): **Fraunces**, a variable font with a real `SOFT` axis.
- Body: **Literata**, drawn for long-form reading and warmer than Newsreader.

Both are OFL-licensed and self-hosted as woff2 in `public/fonts/`, with `font-display: swap` and
preload on the critical face. Self-hosting is deliberate: it avoids a third-party request and prevents
a repeat of the current situation where the declared font is never actually loaded.

### Softening

Body leading 1.75. Measure capped at 68ch. Hairline rules rather than borders. Corner radius 10–12px on
the few surfaces that exist. No drop shadows; warmth comes from paper tone, not elevation. Paper
titles, venue, and year retain firm hierarchy so the page stays scannable.

## Publication entry

Uses only fields already in `papers.bib`: `title`, `author`, `year`, `journal`, `abbr`, `award`, `pdf`,
`code`.

```
Les Dissonances: Cross-Tool Harvesting and
Polluting in Multi-Tool Empowered LLM Agents
Zichuan Li*, Jian Cui*, Xiaojing Liao, Luyi Xing
NDSS 2026 · pdf · code

The Odyssey of robots.txt Governance
Jian Cui*, MingMing Zha*, XiaoFeng Wang, Xiaojing Liao
CCS 2025 · ★ Distinguished Paper · pdf · code
```

The author list occupies the annotation slot, so the layout does not go sparse without summary lines.
Long titles wrapping to two lines at a 68ch measure is intended, not a defect. `selected={true}` is
currently set on 8 of 9 entries and becomes unused; the field stays in the bib but the template ignores
it.

## Responsive system

Current state is ad-hoc: five media queries across 1549 lines of SCSS, at 400px, 575px, 576px, and
768px. The 575/576 pair indicates breakpoints added one at a time rather than designed.

Replacement:

- Fluid type via `clamp()`. Body 16→18px, display 32→56px. Sizes scale continuously instead of jumping.
- Two breakpoints only: **640px** and **1024px**.
- Below 640px the editorial asymmetry collapses; the photo stacks above the bio.
- At 1024px and up, full measure with the photo offset right.
- Single column at every size. There is no multi-column layout to break.
- Navigation is four items and stays inline on mobile. No hamburger, which removes the Bootstrap
  navbar JS dependency.
- 44px minimum touch targets. No horizontal page scroll at 320px. No inner scroll regions anywhere,
  which specifically kills the `max-height: 400px; overflow-y: auto` wrapper currently around news.
- Verified at 320, 375, 768, 1024, 1440.

### CrossFit table, the one custom responsive component

`_pages/misc.md` contains a 4-column table whose Description column holds 150+ character workout
descriptions, with no responsive wrapper. On a phone it overflows the viewport.

Below 640px each row becomes a stacked block:

```
26.1                          191 reps [Rx'd]
─────────────────────────────────────────────
12-min cap: wall balls (20 lb) & box
jump-overs (24") pyramid, 20-30-40-66-40-30-20

Result   47 wall balls into round of 66
         Tiebreak 8:02
```

Same data, no horizontal scroll. Above 640px it remains a table.

## Metadata and SEO

`_config.yml` currently describes the site as "A simple, whitespace theme for academics. Based on
[*folio]...", which is the meta description search engines and link previews display. Related leftovers:
`keywords: jekyll, jekyll-theme, academic-website`, `blog_name: al-folio`, and a footer advertising the
theme. `serve_og_meta` and `serve_schema_org` are both `false`, so shared links produce no preview card.

The rebuild writes a real description, real keywords, Open Graph and Twitter card tags, and
`schema.org` `Person` + `ScholarlyArticle` markup. This is the highest value-per-minute item in the
whole rebuild for someone approaching the job market.

## Asset cleanup

Four unreferenced files totalling ~54MB, confirmed absent from all templates, pages, and data files:

| file | size |
|---|---|
| `assets/img/profile_photo_original.png` | 25MB |
| `assets/video/tutorial_al_folio.mp4` | 26MB |
| `assets/img/profile_photo_old.jpeg` | 1.8MB |
| `assets/video/pexels-engin-akyurt-6069112-960x540-30fps.mp4` | 1.5MB |

`tutorial_al_folio.mp4` is referenced only by `INSTALL.md`, stock al-folio documentation that is
excluded from the build. All four are deleted. Note this removes them from the working tree but not
from git history, so the clone size is unaffected.

Also removed:

- `_data/cv.yml`, `_data/repositories.yml` — consumed only by the dropped `/cv/` and `/projects/` pages.
- `_data/venues.yml` — venue becomes plain text.
- `_data/coauthors.yml` — stock al-folio demo data. Its entries are Adams, Podolsky, Rosen, Bach,
  Przibram, Schrödinger, Lorentz, and Planck, i.e. Einstein's coauthors, not any of Jian's. It is
  currently wired into `_layouts/bib.liquid` for author linking and has never matched a real author.
- `assets/plotly/` — verified unreferenced.
- `assets/jupyter/` — referenced by `_includes/scripts/misc.liquid`, which is itself al-folio machinery
  being deleted. Both go together.
- al-folio docs: `README.md`, `INSTALL.md`, `CUSTOMIZE.md`, `FAQ.md`, `CONTRIBUTING.md`.

## Build and deploy

`npm run dev` locally. GitHub Actions builds with `withastro/action` and deploys to Pages on push to
`master`. The existing `deploy.yml`, `deploy-image.yml`, `deploy-docker-tag.yml`, and `docker-slim.yml`
workflows are replaced by a single workflow.

`docs/` is added to Jekyll's `exclude` list in `_config.yml` for as long as the Jekyll site remains
live, so this spec is not published to the site by an interim deploy.

## Risks

1. **Citation formatting regression.** jekyll-scholar renders APA via CSL. `citation-js` also uses CSL,
   but output will not be byte-identical. Mitigation: compare rendered output for all 9 entries against
   the current live site before cutover.
2. **Redirect correctness.** Astro static redirects emit meta-refresh pages unless configured
   otherwise. Verify each of the four redirects resolves before merging.
3. **Honeypot fidelity.** The hidden-text pages depend on exact color matching against the background.
   The palette changes, so the hidden text color must be updated to the new paper tone or it becomes
   visible. This is the single easiest thing to get wrong in the migration.
4. **Cutover.** GitHub Pages serves from the deployment, so a broken build means a broken live site.
   Build and inspect locally before the first push to `master`.

## Open questions

None blocking. Deferred until implementation: whether `/news/` keeps a dedicated page or the homepage
list simply grows, decidable once the homepage length is visible with real content.
