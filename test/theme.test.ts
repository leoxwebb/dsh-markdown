import { afterEach, describe, expect, it } from 'vitest'
import { mermaidThemeVariables, paletteStyle, readPalette } from '../src/client/theme'
import type { ThemeSnapshot } from '../src/client/types'

const light: ThemeSnapshot = { active: { colorScheme: 'light', tokens: {} }, revision: 1 }
const dark: ThemeSnapshot = { active: { colorScheme: 'dark', tokens: {} }, revision: 2 }

afterEach(() => {
  document.body.removeAttribute('style')
})

describe('theme palette', () => {
  it('reads resolved body tokens', () => {
    document.body.style.setProperty('--dsw-alias-bg-base', '#fafafa')
    document.body.style.setProperty('--dsw-alias-label-primary', '#222222')
    const palette = readPalette(light)
    expect(palette.background).toBe('#fafafa')
    expect(palette.foreground).toBe('#222222')
  })

  it('prefers snapshot token overrides before resolved CSS', () => {
    document.body.style.setProperty('--dsw-alias-bg-base', '#fafafa')
    const themed: ThemeSnapshot = {
      active: { colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#101010' } },
      revision: 3,
    }
    expect(readPalette(themed).background).toBe('#101010')
  })

  it('uses readable light defaults for links and errors', () => {
    const palette = readPalette(light)
    expect(palette.brand).toBe('#4868b2')
    expect(palette.danger).toBe('#570c0c')
  })

  it('exposes canvas variables and Mermaid theme variables', () => {
    const vars = paletteStyle(dark)
    expect(vars['--dsh-md-bg']).toBe('#151517')
    expect(vars['--dsh-md-code-bg']).toBe('#1b1b1c')
    const mermaid = mermaidThemeVariables(dark)
    expect(mermaid.background).toBe('#151517')
    expect(mermaid.primaryTextColor).toBe('#f9fafb')
  })
})
