import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/client/styles.css'), 'utf8')

describe('renderer stylesheet', () => {
  it('resets the host scrollport prose whitespace', () => {
    expect(css).toMatch(/:where\(\.dsh-md-doc\)\s*\{[\s\S]*?white-space:\s*normal/u)
  })

  it('keeps wrap, scrolling, and focus on the keyboard-reachable code section', () => {
    expect(css).toContain('.dsh-md-code-scroll {')
    expect(css).toMatch(/\.dsh-md-code-scroll\[data-wrap=['"]true['"]\] pre/u)
    expect(css).toContain('.dsh-md-code-scroll:focus-visible')
    expect(css).not.toMatch(/\.dsh-md-code pre\[data-wrap/u)
  })

  it('keeps the native top-layer dialog and reduced-motion handling', () => {
    expect(css).toContain(':is(:popover-open, [data-fallback-open])')
    expect(css).toContain('@starting-style')
    expect(css).toContain('transition-behavior: allow-discrete')
    expect(css).toContain('prefers-reduced-motion')
  })
})
