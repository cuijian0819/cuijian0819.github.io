# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Jian Cui's personal academic website (https://cuijian0819.github.io), a customized fork of the
[al-folio](https://github.com/alshedivat/al-folio) Jekyll theme. The upstream docs are still present
(`README.md`, `INSTALL.md`, `CUSTOMIZE.md`, `FAQ.md`) and describe stock al-folio behavior, not the
customizations here.

## Development

Docker is the practical path. The system Ruby (2.6) has no bundler, and the Gemfile targets Ruby 3.2.

```bash
docker compose up          # builds + serves at http://localhost:8080 with livereload
docker compose down
```

Notes on the dev container:

- `JEKYLL_ENV=development` and the build output goes to `/tmp/_site` **inside** the container, so the
  local `./_site/` directory is stale and is not what you are viewing. Verify changes with
  `curl -s http://localhost:8080/<path>` or in a browser, never by reading `./_site/`.
- First `docker compose up` after a Gemfile change runs `bundle install` and takes a few minutes.

Native build (needs Ruby 3.2 + bundler + imagemagick on PATH):

```bash
bundle exec jekyll build   # same as bin/cibuild
bundle exec jekyll serve
```

Formatting (prettier with the Shopify liquid plugin is in `package.json`, no npm script defined):

```bash
npx prettier --write "**/*.{liquid,scss,js,md,yml}"
```

There is no test suite. Verification means building the site and looking at the affected page.

## Deploy

Pushing to `master` triggers `.github/workflows/deploy.yml`: Ruby 3.2.2, `JEKYLL_ENV=production`,
`bundle exec jekyll build --lsi`, then `purgecss -c purgecss.config.js`, then the `_site` folder is
published to the `gh-pages` branch. Pull requests build but do not deploy. `bin/deploy` does the same
thing manually from a local checkout and is normally unnecessary.

Because purgecss only runs in production, CSS that is unused at build time can survive locally but be
stripped on the live site. Its content globs are `_site/**/*.html` and `_site/**/*.js`, so class names
that only ever appear in strings built at runtime are at risk.

## Content model

Almost all edits are content, not code. Content lives in:

- `_pages/*.md` — one file per page. `nav: true` + `nav_order` puts it in the navbar
  (about `/`, publications 2, misc 3, writing 4). `_pages/about.md` is the homepage.
- `_news/announcement_N.md` — news items, `inline: true` renders the body directly in the homepage
  list. `_config.yml: announcements.limit` (currently 5) caps how many show on the homepage;
  `/news/` lists all.
- `_bibliography/papers.bib` — the single source for `/publications/` and the homepage
  "selected papers" list, rendered through jekyll-scholar.
- `_data/venues.yml` — maps a bib `abbr` to a badge color/URL. Unmapped abbrs still render, plain.
- `assets/pdf/`, `assets/img/` — a bare filename in a bib `pdf={...}` field resolves under
  `assets/pdf/`; a full URL is used as-is.

### Bibtex fields that drive rendering

`_layouts/bib.liquid` is customized. Beyond the standard fields it reads:
`selected={true}` (homepage list), `abbr` (venue badge), `award` (renders an `.award-highlight`
block), `media` (renders a `.media-coverage` block), `pdf`, `code`, `preview`. Fields listed under
`filtered_bibtex_keywords` in `_config.yml` are hidden from the copyable BibTeX popup.

## Styling

The site was restyled away from stock al-folio to an Apple Books look. Three files matter:

- `_sass/_variables.scss` — the raw palette (accent `#007aff`, off-white `#fbfbfd`, Inter font).
- `_sass/_themes.scss` — maps the palette onto `--global-*` CSS custom properties, once for light
  (`:root`) and once for dark (`html[data-theme="dark"]`). Change colors here, not in components, and
  always update both themes.
- `_sass/_base.scss` — component styles. Page-specific blocks live at the bottom, e.g. `.misc { ... }`
  backing the cards, timeline, and badge markup written inline in `_pages/misc.md`.

`assets/css/main.scss` is the entry point that imports the partials.

## Gotchas

- `_plugins/fix-binary-read.rb` is a local patch, not upstream. It swallows `Errno::EDEADLK` from
  Docker volume mounts on macOS and, in development only, overrides `StaticFile#write` to bypass
  jekyll-minifier on binary assets. Deleting it breaks `docker compose up` on macOS.
- `_config.yml: imagemagick.enabled: true` generates responsive WebP variants and needs `convert` on
  PATH. The Docker image has it.
- `Gemfile.lock` and `_site/` are listed in `.gitignore`, but `Gemfile.lock` is present locally and CI
  regenerates it via `bundler-cache`.
- `_pages/about.md` contains deliberately hidden text (background-colored, 0.2px) aimed at AI scrapers.
  It is an intentional easter egg. Leave it alone.
- Site chrome that looks stock is: `_layouts/*.liquid` and `_includes/*.liquid` are largely unmodified
  al-folio. Prefer overriding via `_config.yml` flags or Sass before editing a layout.
