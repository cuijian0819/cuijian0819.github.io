import { describe, expect, it } from 'vitest'
import { loadPapers } from '../../src/lib/bibliography'

const papers = loadPapers('_bibliography/papers.bib')
const byKey = (k: string) => papers.find((p) => p.key === k)!

describe('loadPapers', () => {
  it('parses every entry', () => {
    expect(papers).toHaveLength(9)
  })

  it('sorts year-descending, ties in file order', () => {
    expect(papers.map((p) => p.year)).toEqual([2026, 2025, 2025, 2024, 2024, 2024, 2023, 2022, 2022])
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

  it('exposes awards on the three entries that have them', () => {
    expect(byKey('cui2025doyssey').award).toBe('Distinguished Paper Award')
    expect(papers.filter((p) => p.award)).toHaveLength(3)
  })

  it('renders venue as short name plus year', () => {
    expect(byKey('li2025dissonances').venue).toBe('NDSS 2026')
    expect(byKey('lin2024malla').venue).toBe('USENIX Security 2024')
  })

  it('finds Jian Cui in every paper', () => {
    for (const paper of papers) {
      expect(paper.authors.some((a) => a.isSelf), `${paper.key} has no self author`).toBe(true)
    }
  })
})
