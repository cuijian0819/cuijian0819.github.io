import { parse } from '@retorquere/bibtex-parser'
import fs from 'node:fs'
import type { Author, Paper } from './bibliography.types'

/**
 * papers.bib is hand-maintained and inconsistent. It mixes "Last, First" and
 * "First Last" author formats in the same file, embeds equal-contribution
 * asterisks inside surnames, stores raw HTML in `media`, and stores `pdf` as
 * either a bare filename or an absolute URL. Everything that understands those
 * quirks lives in this module.
 */

/** Short forms whose abbr prefix is ambiguous standing alone. */
const VENUE_NAMES: Record<string, string> = {
  Security: 'USENIX Security',
}

const SELF = { first: 'Jian', last: 'Cui' }

function toAuthor(raw: { firstName?: string; lastName?: string }): Author {
  const first = raw.firstName ?? ''
  const last = raw.lastName ?? ''
  // "Cui*" and "Cui" are the same person. Strip for comparison, keep for display.
  const bareLast = last.replace(/\*/g, '')
  return {
    first,
    last,
    isSelf: bareLast === SELF.last && first === SELF.first,
    display: [first, last].filter(Boolean).join(' '),
  }
}

/** The `media` field is hand-written HTML and some entries end with a stray
 *  comma inside the braces, which renders as a dangling ", " after the last link. */
function tidyMedia(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/,\s*$/, '')
  return trimmed || undefined
}

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

  // Both options are load-bearing:
  //   sentenceCase:false  — otherwise titles are lowercased, e.g.
  //                         "Non-Linguistic Elements" -> "non-linguistic elements"
  //   verbatimFields      — otherwise the LaTeX-to-unicode pass rewrites "<" as
  //                         "!" and destroys the anchor tags in `media`
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
      mediaHtml: tidyMedia(f.media),
      pdfUrl: resolvePdf(f.pdf),
      codeUrl: f.code || undefined,
    }
  })

  // Array.prototype.sort is stable, so equal years keep bib file order.
  return papers.sort((a, b) => b.year - a.year)
}
