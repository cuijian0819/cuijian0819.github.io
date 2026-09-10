import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadPapers } from '../../src/lib/bibliography'

const BIB = '_bibliography/papers.bib'
const source = readFileSync(BIB, 'utf8')
const papers = loadPapers(BIB)
const byKey = (k: string) => papers.find((p) => p.key === k)!

/** Counted from the source, not hardcoded: adding a paper should not fail a test. */
const count = (pattern: RegExp) => (source.match(pattern) ?? []).length

describe('loadPapers', () => {
  it('parses every entry', () => {
    const entries = count(/^@\w+\{/gm)
    expect(entries).toBeGreaterThan(0)
    expect(papers).toHaveLength(entries)
  })

  it('sorts year-descending, ties in file order', () => {
    const years = papers.map((p) => p.year)
    expect(years).toEqual([...years].sort((a, b) => b - a))
    // The 2026 entries in file order: the preprint, then NDSS'26.
    expect(papers.slice(0, 2).map((p) => p.key)).toEqual(['cui2026maris', 'li2025dissonances'])
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
    // Regression: without verbatimFields the parser turns "<" into "!".
    const html = byKey('lin2024malla').mediaHtml!
    expect(html).toContain('<a href="https://www.wsj.com')
    expect(html).not.toContain('¡')
  })

  it('strips the trailing comma some media fields end with', () => {
    // The bib source has a stray "," after the last <a> in these entries.
    expect(byKey('jin-etal-2023-darkbert').mediaHtml!.trimEnd()).not.toMatch(/,$/)
    expect(byKey('lin2024malla').mediaHtml!.trimEnd()).not.toMatch(/,$/)
  })

  it('exposes awards on the entries that have them', () => {
    expect(byKey('cui2025doyssey').award).toBe('Distinguished Paper Award')
    expect(papers.filter((p) => p.award)).toHaveLength(count(/^\s*award\s*=/gm))
  })

  it('renders venue as short name plus year', () => {
    expect(byKey('li2025dissonances').venue).toBe('NDSS 2026')
    expect(byKey('lin2024malla').venue).toBe('USENIX Security 2024')
  })

  // PaperEntry outlines the badge on venueKey === 'arXiv', so the preprints must
  // carry that key rather than a target venue they have not been accepted to.
  it('keys preprints on arXiv', () => {
    expect(byKey('cui2026maris').venueKey).toBe('arXiv')
    expect(byKey('cui2026maris').venue).toBe('arXiv 2026')
  })

  // venueKey drives the badge glyph, so it must stay the bare abbr: no year, and
  // not the expanded display name ("Security", never "USENIX Security").
  it('exposes a bare venue key for the badge glyph', () => {
    expect(byKey('li2025dissonances').venueKey).toBe('NDSS')
    expect(byKey('lin2024malla').venueKey).toBe('Security')
    for (const paper of papers) {
      expect(paper.venueKey, `${paper.key} venueKey has a year in it`).not.toMatch(/\d/)
    }
  })

  it('finds Jian Cui in every paper', () => {
    for (const paper of papers) {
      expect(paper.authors.some((a) => a.isSelf), `${paper.key} has no self author`).toBe(true)
    }
  })
})
