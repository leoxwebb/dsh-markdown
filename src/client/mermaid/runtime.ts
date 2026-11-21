/** Serialized Mermaid rendering against the bundled browser runtime. */
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
import { mermaidThemeVariables } from '../theme'
import type { ThemeSnapshot } from '../types'

let sequence = 0
let queue: Promise<unknown> = Promise.resolve()

/**
 * Remove Mermaid directives (`%%{init: ...}%%` and peers) before parsing.
 * Mermaid under `securityLevel: 'strict'` still accepts `themeCSS`, which its
 * generated inline `<style>` would apply document-wide. Diagrams own their
 * configuration through this plugin, not through document source.
 * @param source - authored Mermaid source.
 * @returns source without directive blocks.
 */
export function sanitizeMermaidSource(source: string): string {
  const withoutBom = source.replace(/^\uFEFF/u, '')
  // Mermaid 11 also accepts a leading YAML frontmatter block with per-diagram
  // config (`securityLevel`, `htmlLabels`, `themeCSS`, ...). Strip it before
  // parsing so a document cannot weaken the configuration this plugin owns.
  const withoutFrontmatter = withoutBom.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/u, '')
  return withoutFrontmatter.replace(/%%\{[\s\S]*?\}%%/gu, '')
}

/**
 * Sanitize Mermaid's SVG with the profiles its output needs.
 * @param svg - markup returned by Mermaid.
 * @returns safe markup for an in-document SVG subtree.
 */
export function sanitizeMermaidSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_ATTR: ['role', 'aria-label', 'aria-labelledby', 'focusable'],
  })
}

/**
 * Render one Mermaid source with the active DSH palette.
 * @param source - Mermaid diagram source.
 * @param theme - current theme snapshot.
 * @returns SVG markup produced by Mermaid.
 */
export function renderMermaid(source: string, theme: ThemeSnapshot): Promise<string> {
  const task = queue.then(async () => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: mermaidThemeVariables(theme),
      // SVG text labels keep DOMPurify's SVG profile sufficient; HTML labels
      // (foreignObject) cannot be sanitized by the SVG profile safely.
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      suppressErrorRendering: true,
      maxTextSize: 50_000,
    })
    sequence += 1
    const result = await mermaid.render(`dsh-markdown-${sequence}`, sanitizeMermaidSource(source))
    if (typeof result.svg !== 'string' || result.svg.trim() === '') {
      throw new Error('Mermaid returned an empty SVG')
    }
    const clean = sanitizeMermaidSvg(result.svg)
    if (clean.trim() === '') throw new Error('Mermaid returned no safe SVG content')
    return clean
  })
  queue = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}
