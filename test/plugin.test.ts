import { afterEach, describe, expect, it } from 'vitest'
import { apply, inject, pipeline } from '../src/client/entry'
import type { ClientContext, DocumentPreviewDefinition, SlotRegistrationOptions } from '../src/client/types'

interface Registration {
  readonly name: string
  readonly options: SlotRegistrationOptions
  readonly component: unknown
}

const cleanups: (() => void)[] = []

function fakeContext(): {
  ctx: ClientContext
  previews: DocumentPreviewDefinition[]
  registrations: Registration[]
  locales: string[]
} {
  const previews: DocumentPreviewDefinition[] = []
  const registrations: Registration[] = []
  const locales: string[] = []
  const ctx: ClientContext = {
    locale: {
      register: (namespace) => {
        locales.push(namespace)
        return () => {}
      },
      bind: () => (key) => key,
    },
    theme: {
      getTheme: () => ({ active: { colorScheme: 'light', tokens: {} }, revision: 0 }),
    },
    documentPreviews: {
      register: (definition) => {
        previews.push(definition)
        return () => {}
      },
    },
    slots: {
      inject: (_name, factory) => {
        const dispose = factory()
        cleanups.push(dispose)
        return dispose
      },
      register: (options, component) => {
        registrations.push({ name: options.name, options, component })
        return () => {}
      },
    },
    effect: (callback) => {
      cleanups.push(callback())
    },
    on: () => () => {},
  }
  return { ctx, previews, registrations, locales }
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.()
  document.querySelectorAll('style[data-dsh-markdown]').forEach((element) => {
    element.remove()
  })
})

describe('client plugin wiring', () => {
  it('declares only the DSH services it consumes', () => {
    expect(inject).toEqual(['slots', 'locale', 'theme', 'documentPreviews'])
  })

  it('registers a Markdown document renderer and a shell overlay', () => {
    const { ctx, previews, registrations, locales } = fakeContext()
    apply(ctx)
    expect(previews).toHaveLength(1)
    expect(previews[0]?.id).toBe('@local/dsh-markdown/markdown')
    expect(previews[0]?.extensions).toEqual(['md', 'markdown'])
    expect(previews[0]?.priority).toBe('extension')
    expect(previews[0]?.loading).toBe('text-pages')
    expect(previews[0]?.wrap).toBe(true)
    expect(previews[0]?.sourceLines).toBe(false)
    expect(registrations.map((entry) => entry.name)).toEqual(['sidebar.right.tab.document', 'shell.overlay'])
    expect(registrations[0]?.options.key).toBe('@local/dsh-markdown/markdown')
    expect(registrations[0]?.options.locale).toBe('dshMarkdown')
    expect(registrations[1]?.options.id).toBe('@local/dsh-markdown/overlay')
    expect(locales).toContain('dshMarkdown')
    expect(document.querySelector('style[data-dsh-markdown]')).not.toBeNull()
  })

  it('composes the pipeline from the default extension list', () => {
    expect(pipeline.fences.resolve('mermaid')?.id).toBe('mermaid')
    expect(pipeline.overlays.has('mermaid')).toBe(true)
    expect(pipeline.frontmatter).toHaveLength(1)
  })

  it('cleans up the styles element and store on teardown', () => {
    const { ctx } = fakeContext()
    apply(ctx)
    expect(document.querySelector('style[data-dsh-markdown]')).not.toBeNull()
    while (cleanups.length > 0) cleanups.pop()?.()
    expect(document.querySelector('style[data-dsh-markdown]')).toBeNull()
  })

  it('does not touch Chat or document DOM', () => {
    const source = apply.toString()
    expect(source).not.toContain('conversation.chat.markdown.fence')
    expect(source).not.toContain('MutationObserver')
    expect(source).not.toContain('document.body.append')
  })

  it('exposes no fullscreen request', () => {
    expect(apply.toString()).not.toContain('requestFullscreen')
  })
})
