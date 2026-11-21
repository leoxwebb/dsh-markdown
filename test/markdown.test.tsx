import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { defaultExtensions } from '../src/client/extensions'
import { MarkdownDocument } from '../src/client/markdown/MarkdownDocument'
import { createMarkdownPipeline } from '../src/client/markdown/pipeline'
import { ViewerStore } from '../src/client/overlay/viewer-store'
import type { DocumentBodyProps, ThemeSnapshot } from '../src/client/types'

const pipeline = createMarkdownPipeline(defaultExtensions, { id: 'test' })
const theme: ThemeSnapshot = { active: { colorScheme: 'light', tokens: {} }, revision: 1 }
const themeStore = { getSnapshot: () => theme, subscribe: () => () => {} }
const t = (key: string): string => key

function props(text: string, absolutePath: string | null = '/docs/guide.md'): DocumentBodyProps {
  return {
    content: { kind: 'text', text, pages: [], eof: true },
    resourceAddress: 'file:///docs/guide.md',
    wrap: false,
    scrollportRef: vi.fn(),
    useResource: () => ({ value: absolutePath === null ? {} : { absolutePath } }),
    t,
  }
}

function render(text: string, absolutePath?: string | null): string {
  return renderToStaticMarkup(
    <MarkdownDocument
      {...props(text, absolutePath)}
      pipeline={pipeline}
      viewer={new ViewerStore()}
      themeStore={themeStore}
    />,
  )
}

describe('MarkdownDocument', () => {
  it('renders headings, GFM lists, task lists, and tables', () => {
    const html = render('# Title\n\n- one\n- two\n\n- [x] done\n\n| a | b |\n| - | - |\n| 1 | 2 |')
    expect(html).toContain('<h1 id="title">Title</h1>')
    expect(html).toContain('<p>one</p>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('dsh-md-table')
    expect(html).toContain('aria-label=')
  })

  it('highlights a known fenced language and exposes the copy control', () => {
    const html = render('```ts\nconst answer: number = 42\n```')
    expect(html).toContain('class="dsh-md-code"')
    expect(html).toContain('hljs')
    expect(html).toContain('hljs-keyword')
    expect(html).toContain('code.copy')
    expect(html).toContain('aria-label=')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('dsh-md-code-scroll')
  })

  it('renders Mermaid fences as diagram cards without a code language class', () => {
    const html = render('```mermaid\nflowchart TD\n A-->B\n```')
    expect(html).toContain('dsh-md-diagram')
    expect(html).toContain('diagram.loading')
    expect(html).not.toContain('language-mermaid')
    expect(html).not.toContain('class="dsh-md-code"')
  })

  it('does not use content sniffing for unlabeled fences', () => {
    const html = render('```\ngraph LR\n A-->B\n```')
    expect(html).toContain('class="dsh-md-code"')
    expect(html).not.toContain('dsh-md-diagram')
  })

  it('keeps a known non-Mermaid language as code even when it looks like Mermaid', () => {
    const html = render('```text\nsequenceDiagram\n A->>B: Hi\n```')
    expect(html).toContain('class="dsh-md-code"')
    expect(html).not.toContain('dsh-md-diagram')
  })

  it('renders inline code distinctly', () => {
    const html = render('Use `npm install` now.')
    expect(html).toContain('dsh-md-inline')
    expect(html).not.toContain('class="dsh-md-code"')
  })

  it('parses frontmatter into a key/value list', () => {
    const html = render('---\ntitle: Guide\ntags:\n  - a\n  - b\n---\n\nBody')
    expect(html).toContain('dsh-md-frontmatter-panel')
    expect(html).toContain('<summary>frontmatter.label</summary>')
    expect(html).not.toMatch(/<details[^>]*dsh-md-frontmatter-panel[^>]*open/u)
    expect(html).toContain('title')
    expect(html).toContain('Guide')
    expect(html).toContain('&quot;a&quot;')
    expect(html).toContain('<p>Body</p>')
  })

  it('parses completed frontmatter while the document still streams', () => {
    const html = renderToStaticMarkup(
      <MarkdownDocument
        {...props('---\ntitle: Guide\n---\n\nBody')}
        content={{ kind: 'text', text: '---\ntitle: Guide\n---\n\nBody', pages: [], eof: false }}
        pipeline={pipeline}
        viewer={new ViewerStore()}
        themeStore={themeStore}
      />,
    )
    expect(html).toContain('dsh-md-frontmatter-panel')
    expect(html).toContain('data-streaming')
  })

  it('keeps invalid frontmatter verbatim in a collapsed panel', () => {
    const html = render('---\ntitle: [unclosed\n---\n\nBody')
    expect(html).toContain('dsh-md-frontmatter-source')
    expect(html).toContain('title: [unclosed')
    expect(html).not.toMatch(/<details[^>]*dsh-md-frontmatter-panel[^>]*open/u)
  })

  it('resolves relative images through the file route and strips query/fragment', () => {
    const html = render('![diagram](img/diagram.png?raw=1#preview)')
    expect(html).toContain('api/file?path=')
    expect(html).toContain('diagram.png')
    expect(html).not.toContain('raw%3D1')
    expect(html).not.toContain('preview')
    expect(html).toContain('loading="lazy"')
  })

  it('shows alt text instead of an unresolved local image', () => {
    const html = render('![diagram](img/diagram.png)', null)
    expect(html).not.toContain('api/file?path=')
    expect(html).toContain('dsh-md-image-alt')
    expect(html).toContain('diagram')
  })

  it('opens external links safely and refuses executable schemes', () => {
    const external = render('[site](https://example.com)')
    expect(external).toContain('target="_blank"')
    expect(external).toContain('rel="noopener noreferrer"')
    const hostile = render('[x](javascript:alert(1))')
    expect(hostile).not.toContain('javascript:')
  })

  it('does not render raw HTML', () => {
    const html = render('<script>alert(1)</script>\n\n**safe**')
    expect(html).not.toContain('<script')
    expect(html).toContain('<strong>safe</strong>')
  })

  it('marks the document theme and streaming state', () => {
    const html = render('# Title')
    expect(html).toContain('data-theme="light"')
    expect(html).toContain('data-dsh-markdown')
    expect(html).not.toContain('data-streaming')
  })
})
