// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultExtensions } from '../src/client/extensions'
import { createMarkdownPipeline } from '../src/client/markdown/pipeline'
import { MarkdownOverlay } from '../src/client/overlay/MarkdownOverlay'
import { ViewerStore } from '../src/client/overlay/viewer-store'
import type { ThemeSnapshot } from '../src/client/types'

const pipeline = createMarkdownPipeline(defaultExtensions)
const theme: ThemeSnapshot = { active: { colorScheme: 'light', tokens: {} }, revision: 1 }
const themeStore = { getSnapshot: () => theme, subscribe: () => () => {} }
const t = (key: string): string => key

declare global {
  // React's test-only act environment flag.
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect
}

function mountFrame(): {
  frame: HTMLElement
  centre: HTMLElement
  rightbar: HTMLElement
  layer: HTMLElement
  container: HTMLElement
} {
  const frame = document.createElement('div')
  const centre = document.createElement('div')
  const rightbar = document.createElement('div')
  rightbar.setAttribute('data-rightbar-col', '')
  frame.append(centre, rightbar)
  const layer = document.createElement('div')
  layer.setAttribute('data-shell-overlay', '')
  frame.append(layer)
  const container = document.createElement('div')
  layer.append(container)
  document.body.append(frame)
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(0, 40, 1000, 800))
  vi.spyOn(centre, 'getBoundingClientRect').mockReturnValue(rect(280, 40, 420, 800))
  vi.spyOn(rightbar, 'getBoundingClientRect').mockReturnValue(rect(700, 40, 300, 800))
  return { frame, centre, rightbar, layer, container }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  delete (HTMLElement.prototype as { showPopover?: unknown }).showPopover
  delete (HTMLElement.prototype as { hidePopover?: unknown }).hidePopover
})

describe('MarkdownOverlay', () => {
  it('renders a native popover dialog over the centre column and right sidebar', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const { container, centre, rightbar } = mountFrame()
    const store = new ViewerStore()
    const root = createRoot(container)
    store.open({ kind: 'mermaid', title: 'Mermaid diagram', source: 'flowchart TD\n A-->B', language: 'mermaid' }, null)
    act(() => {
      root.render(<MarkdownOverlay store={store} themeStore={themeStore} t={t} pipeline={pipeline} />)
    })

    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('popover')).toBe('manual')
    expect(dialog?.getAttribute('data-fallback-open')).toBe('')
    expect(dialog?.getAttribute('aria-labelledby')).not.toBeNull()
    expect(dialog?.style.left).toBe('280px')
    expect(dialog?.style.top).toBe('40px')
    expect(dialog?.style.width).toBe('720px')
    expect(dialog?.style.height).toBe('800px')
    expect(container.querySelector('[role="application"]')).toBe(document.activeElement)
    expect(centre.hasAttribute('inert')).toBe(true)
    expect(rightbar.hasAttribute('inert')).toBe(true)

    act(() => {
      store.close()
    })
    expect(store.getSnapshot()).toBeNull()
    expect(centre.hasAttribute('inert')).toBe(false)
    expect(rightbar.hasAttribute('inert')).toBe(false)
    act(() => root.unmount())
  })

  it('calls showPopover when the platform supports it', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const showPopover = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { value: showPopover, configurable: true })
    const { container } = mountFrame()
    const store = new ViewerStore()
    const root = createRoot(container)
    store.open({ kind: 'mermaid', title: 'Mermaid diagram', source: 'flowchart TD\n A-->B', language: 'mermaid' }, null)
    act(() => {
      root.render(<MarkdownOverlay store={store} themeStore={themeStore} t={t} pipeline={pipeline} />)
    })
    expect(showPopover).toHaveBeenCalledTimes(1)
    expect(container.querySelector('dialog')?.hasAttribute('data-fallback-open')).toBe(false)
    act(() => store.close())
    act(() => root.unmount())
  })

  it('shows an extension error when no overlay renderer matches', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const { container } = mountFrame()
    const store = new ViewerStore()
    const root = createRoot(container)
    store.open({ kind: 'unknown', title: 'Unknown', source: '', language: '' }, null)
    act(() => {
      root.render(<MarkdownOverlay store={store} themeStore={themeStore} t={t} pipeline={pipeline} />)
    })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('extension.error')
    act(() => store.close())
    act(() => root.unmount())
  })
})
