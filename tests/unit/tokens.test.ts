import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

const tokens = fs.readFileSync('src/styles/tokens.css', 'utf8')
const global = fs.readFileSync('src/styles/global.css', 'utf8')

describe('design tokens', () => {
  it('defines both themes', () => {
    expect(tokens).toMatch(/:root\s*\{/)
    expect(tokens).toMatch(/\[data-theme=["']dark["']\]/)
  })

  it('uses the approved warm palette', () => {
    for (const hex of ['#FBF8F3', '#1A1815', '#33302B', '#EDE7DE', '#B5654A', '#E08B6B']) {
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

  it('separates display from body with optical size and weight, not a second family', () => {
    // Fraunces was dropped: its J has a hooked descender that no axis changes.
    expect(tokens).not.toContain('fraunces')
    expect(global).toContain("'opsz'")
  })

  it('caps the measure and sets warm leading', () => {
    expect(tokens).toContain('--measure: 68ch')
    expect(tokens).toContain('--leading: 1.75')
  })
})
