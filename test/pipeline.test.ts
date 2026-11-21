import { describe, expect, it } from 'vitest'
import { defaultExtensions } from '../src/client/extensions'
import type { FenceRenderer, MarkdownExtension } from '../src/client/markdown/extension'
import { FenceRegistry } from '../src/client/markdown/fence-registry'
import { createMarkdownPipeline } from '../src/client/markdown/pipeline'
import { safeUrl } from '../src/client/markdown/url'

const NullComponent = () => null
const OverrideComponent = () => null

function fence(id: string, languages: readonly string[]): FenceRenderer {
  return { id, languages, Component: NullComponent }
}

describe('FenceRegistry', () => {
  it('resolves aliases case-insensitively', () => {
    const registry = new FenceRegistry()
    registry.register(fence('mermaid', ['mermaid', 'mmd']))
    expect(registry.resolve('MERMAID')?.id).toBe('mermaid')
    expect(registry.resolve('mmd')?.id).toBe('mermaid')
    expect(registry.languages()).toEqual(['mermaid', 'mmd'])
  })

  it('rejects two renderers claiming one language', () => {
    const registry = new FenceRegistry()
    registry.register(fence('one', ['mermaid']))
    expect(() => registry.register(fence('two', ['mermaid']))).toThrow(/claimed by both/u)
  })

  it('rejects empty language lists', () => {
    expect(() => new FenceRegistry().register(fence('empty', []))).toThrow(/declares no languages/u)
  })
})

describe('createMarkdownPipeline', () => {
  it('composes the default extensions', () => {
    const pipeline = createMarkdownPipeline(defaultExtensions, { id: 'test' })
    expect(pipeline.id).toBe('test')
    expect(pipeline.fences.resolve('mermaid')?.id).toBe('mermaid')
    expect(pipeline.fences.resolve('graph')).toBeUndefined()
    expect(pipeline.frontmatter[0]?.id).toBe('frontmatter-metadata')
    expect(pipeline.overlays.get('mermaid')?.kind).toBe('mermaid')
    expect(pipeline.rehypePlugins.at(-1)).toBeTypeOf('function')
    expect(pipeline.urlTransform('https://example.com')).toBe('https://example.com')
    expect(pipeline.urlTransform('javascript:alert(1)')).toBe('')
  })

  it('lets later component overrides win', () => {
    const pipeline = createMarkdownPipeline([
      { id: 'first', components: { h1: NullComponent } },
      { id: 'second', components: { h1: OverrideComponent } },
    ])
    expect(pipeline.components.h1).toBe(OverrideComponent)
  })

  it('rejects duplicate extension ids', () => {
    expect(() => createMarkdownPipeline([{ id: 'same' }, { id: 'same' }])).toThrow(/duplicate extension id/u)
  })

  it('rejects duplicate overlay kinds', () => {
    const overlay = { kind: 'mermaid', Component: NullComponent }
    expect(() =>
      createMarkdownPipeline([
        { id: 'a', overlays: [overlay] },
        { id: 'b', overlays: [overlay] },
      ]),
    ).toThrow(/duplicate overlay kind/u)
  })

  it('requires an overlay for a mermaid fence', () => {
    expect(() =>
      createMarkdownPipeline([
        {
          id: 'only-fence',
          fences: [{ id: 'mermaid', languages: ['mermaid'], overlayKind: 'mermaid', Component: NullComponent }],
        },
      ]),
    ).toThrow(/requires overlay "mermaid"/u)
  })

  it('accepts a fence whose declared overlay kind is registered', () => {
    const pipeline = createMarkdownPipeline([
      {
        id: 'chart',
        fences: [{ id: 'chart', languages: ['chart'], overlayKind: 'chart', Component: NullComponent }],
        overlays: [{ kind: 'chart', Component: NullComponent }],
      },
    ])
    expect(pipeline.fences.resolve('chart')?.overlayKind).toBe('chart')
  })

  it('applies extension URL transforms after the safe transform', () => {
    const pipeline = createMarkdownPipeline([
      {
        id: 'rewrite',
        urlTransform: (url) => (url.startsWith('/wiki/') ? `https://wiki.example${url}` : url),
      },
    ])
    expect(pipeline.urlTransform('/wiki/home')).toBe('https://wiki.example/wiki/home')
    expect(pipeline.urlTransform('javascript:alert(1)')).toBe('')
  })

  it('rejects duplicate extension ids through the typed extension list', () => {
    const extensions: MarkdownExtension[] = [{ id: 'typed' }, { id: 'typed' }]
    expect(() => createMarkdownPipeline(extensions)).toThrow(/duplicate extension id/u)
  })
})

describe('safeUrl', () => {
  it('allows web, mail, desktop, and raster data URLs', () => {
    expect(safeUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(safeUrl('mailto:a@example.com')).toBe('mailto:a@example.com')
    expect(safeUrl('dsh-app://app/api/file?path=%2Fa.md')).toContain('dsh-app:')
    expect(safeUrl('data:image/png;base64,AAAA')).toContain('data:image/png')
    expect(safeUrl('./relative.png')).toBe('./relative.png')
    expect(safeUrl('#anchor')).toBe('#anchor')
  })

  it('rejects executable schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('')
    expect(safeUrl('vbscript:msgbox(1)')).toBe('')
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
  })
})
