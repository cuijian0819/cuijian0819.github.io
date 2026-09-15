import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

const tokens = fs.readFileSync('src/styles/editorial.css', 'utf8')
const global = fs.readFileSync('src/styles/global.css', 'utf8')

describe('design tokens', () => {
  it('defines both themes', () => {
    expect(tokens).toContain("html:root[data-design='editorial']")
    expect(tokens).toMatch(/\[data-theme=["']dark["']\]/)
  })

  it('uses the approved monochrome palette', () => {
    for (const hex of ['#ffffff', '#121110', '#141414', '#edeae4', '#6a6a6a', '#9a948c']) {
      expect(tokens).toContain(hex)
    }
  })

  it('contains no trace of the old Apple blue', () => {
    expect(tokens.toLowerCase()).not.toContain('007aff')
    expect(global.toLowerCase()).not.toContain('007aff')
  })

  it('scales type fluidly rather than at breakpoints', () => {
    expect(tokens).toContain('clamp(')
  })

  it('uses Garamond without Literata optical-size settings', () => {
    expect(tokens).toContain('EB Garamond Variable')
    expect(tokens).toContain('font-variation-settings: normal')
  })

  it('caps the measure and uses reading-friendly leading', () => {
    expect(tokens).toContain('--measure: 66ch')
    expect(tokens).toContain('--leading: 1.5')
  })
})
