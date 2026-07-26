export type Author = {
  first: string
  last: string
  /** True for Jian Cui, so the template can mark him in the author list. */
  isSelf: boolean
  /** "Jian Cui*" — equal-contribution asterisks are kept for display. */
  display: string
}

export type Paper = {
  key: string
  title: string
  authors: Author[]
  year: number
  /** Short venue plus year, e.g. "NDSS 2026". */
  venue: string
  /** Full conference name, used as the venue's title attribute. */
  venueFull: string
  award?: string
  /** Raw HTML from the bib file's `media` field. Must be rendered with set:html. */
  mediaHtml?: string
  pdfUrl?: string
  codeUrl?: string
}
