import { describe, expect, it } from 'vitest'
import { fileMediaUrl, markdownImageUrl } from '../src/client/markdown/images'
import { sanitizeMermaidSource, sanitizeMermaidSvg } from '../src/client/mermaid/runtime'

describe('Mermaid sanitization', () => {
  it('keeps Mermaid SVG styling and removes scripts and event handlers', () => {
    const dirty = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">',
      '<style>.node { fill: red; }</style>',
      '<script>alert(1)</script>',
      '<rect width="10" height="10" onload="alert(2)" />',
      '</svg>',
    ].join('')
    const clean = sanitizeMermaidSvg(dirty)
    expect(clean).toContain('<style>')
    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('onload')
    expect(clean).not.toContain('alert(1)')
  })

  it('removes init/themeCSS directives while preserving diagram source', () => {
    const hostile = '%%{init: {"themeCSS": "body{display:none}"}}%%\nflowchart TD\n A-->B'
    const clean = sanitizeMermaidSource(hostile)
    expect(clean).not.toContain('themeCSS')
    expect(clean).not.toContain('%%{')
    expect(clean).toContain('flowchart TD')
    expect(clean).toContain('A-->B')
  })

  it('strips leading Mermaid frontmatter configuration', () => {
    const hostile = [
      '---',
      'config:',
      '  securityLevel: loose',
      '  htmlLabels: true',
      '  themeCSS: "body{display:none}"',
      '---',
      'flowchart TD',
      ' A-->B',
    ].join('\n')
    const clean = sanitizeMermaidSource(hostile)
    expect(clean).not.toContain('securityLevel')
    expect(clean).not.toContain('htmlLabels')
    expect(clean).not.toContain('themeCSS')
    expect(clean).toContain('flowchart TD')
    expect(clean).toContain('A-->B')
  })

  it('leaves ordinary comments and non-directive source intact', () => {
    const source = '%% a comment\nflowchart TD\n A-->B'
    expect(sanitizeMermaidSource(source)).toBe(source)
  })
})

describe('document image URLs', () => {
  it('builds an authenticated file URL for a relative image', () => {
    const url = markdownImageUrl('http://127.0.0.1:59111/', '/docs/guide.md', 'img/diagram.png?raw=1#preview')
    expect(url).toBe('http://127.0.0.1:59111/api/file?path=%2Fdocs%2Fimg%2Fdiagram.png')
  })

  it('uses the Desktop origin when the base is dsh-app', () => {
    expect(fileMediaUrl('dsh-app://app/', '/docs/a.png')).toBe('dsh-app://app/api/file?path=%2Fdocs%2Fa.png')
  })

  it('keeps remote and data images authored', () => {
    expect(markdownImageUrl('http://localhost/', '/docs/guide.md', 'https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    )
    expect(markdownImageUrl('http://localhost/', '/docs/guide.md', 'data:image/png;base64,AAAA')).toContain(
      'data:image/png',
    )
  })

  it('rejects unsupported transports, UNC paths, and malformed escapes', () => {
    expect(fileMediaUrl('file:///tmp/', '/docs/a.png')).toBeUndefined()
    expect(fileMediaUrl('http://localhost/', '//server/share/a.png')).toBeUndefined()
    expect(fileMediaUrl('http://localhost/', '/docs/a\u0000.png')).toBeUndefined()
    expect(markdownImageUrl('http://localhost/', '/docs/guide.md', '%E0%A4%A')).toBeUndefined()
    expect(markdownImageUrl('http://localhost/', '/docs/guide.md', 'javascript:alert(1)')).toBeUndefined()
  })

  it('requires the Host path for a relative image', () => {
    expect(markdownImageUrl('http://localhost/', undefined, 'img/a.png')).toBeUndefined()
  })
})
