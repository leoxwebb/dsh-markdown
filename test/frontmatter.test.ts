import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from '../src/shared/frontmatter'

describe('splitFrontmatter', () => {
  it('separates a closed YAML block from the body', () => {
    expect(splitFrontmatter('---\ntitle: Guide\n---\n\n# Body')).toEqual({
      source: 'title: Guide',
      body: '\n# Body',
    })
  })

  it('accepts the YAML document-end delimiter', () => {
    expect(splitFrontmatter('---\ntitle: Guide\n...\nBody').source).toBe('title: Guide')
  })

  it('leaves an unterminated block in the Markdown body', () => {
    const value = '---\ntitle: Guide\n# Body'
    expect(splitFrontmatter(value)).toEqual({ source: null, body: value })
  })

  it('ignores a horizontal rule that does not start the document', () => {
    const value = '# Title\n\n---\ntext\n---'
    expect(splitFrontmatter(value)).toEqual({ source: null, body: value })
  })

  it('strips a byte-order mark before detecting the opening delimiter', () => {
    expect(splitFrontmatter('\uFEFF---\ntitle: Guide\n---\nBody').source).toBe('title: Guide')
  })

  it('does not treat an oversized block as metadata', () => {
    const value = `---\n${'x'.repeat(64_001)}\n---\n`
    expect(splitFrontmatter(value).source).toBeNull()
  })

  it('handles CRLF documents', () => {
    expect(splitFrontmatter('---\r\ntitle: Guide\r\n---\r\nBody')).toEqual({
      source: 'title: Guide',
      body: 'Body',
    })
  })
})
