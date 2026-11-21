import { afterEach, describe, expect, it, vi } from 'vitest'
import { overlayBounds, overlayScope } from '../src/client/overlay/geometry'
import { ViewerStore } from '../src/client/overlay/viewer-store'

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

function mountDom(): {
  frame: HTMLElement
  sidebar: HTMLElement
  centre: HTMLElement
  rightbar: HTMLElement
  layer: HTMLElement
  root: HTMLElement
} {
  const frame = document.createElement('div')
  const sidebar = document.createElement('div')
  const centre = document.createElement('div')
  const rightbar = document.createElement('div')
  rightbar.setAttribute('data-rightbar-col', '')
  frame.append(sidebar, centre, rightbar)
  const layer = document.createElement('div')
  layer.setAttribute('data-shell-overlay', '')
  const slot = document.createElement('div')
  slot.setAttribute('data-slot', 'shell.overlay')
  const root = document.createElement('div')
  slot.append(root)
  layer.append(slot)
  frame.append(layer)
  document.body.append(frame)
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(rect(0, 40, 1000, 800))
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 1000, 880))
  vi.spyOn(sidebar, 'getBoundingClientRect').mockReturnValue(rect(0, 40, 280, 800))
  vi.spyOn(centre, 'getBoundingClientRect').mockReturnValue(rect(280, 40, 420, 800))
  return { frame, sidebar, centre, rightbar, layer, root }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('overlay geometry', () => {
  it('starts at the centre column and covers the right sidebar in viewport coordinates', () => {
    const { frame, layer, root } = mountDom()
    const scope = overlayScope(root)
    expect(scope?.layer).toBe(layer)
    expect(scope?.frame).toBe(frame)
    if (scope === null) throw new Error('expected an overlay scope')
    expect(overlayBounds(scope)).toEqual({ left: 280, top: 40, width: 720, height: 800 })
  })

  it('falls back to the conversation content anchor', () => {
    const { frame, rightbar, root } = mountDom()
    rightbar.remove()
    const conversation = document.createElement('section')
    conversation.setAttribute('data-conversation-content', '')
    frame.append(conversation)
    vi.spyOn(conversation, 'getBoundingClientRect').mockReturnValue(rect(300, 40, 700, 800))
    const scope = overlayScope(root)
    if (scope === null) throw new Error('expected an overlay scope')
    expect(overlayBounds(scope)).toEqual({ left: 300, top: 40, width: 700, height: 800 })
  })

  it('keeps a drawer/sidebar wider than the centre left edge uncovered', () => {
    const { frame, sidebar, centre, root } = mountDom()
    vi.spyOn(sidebar, 'getBoundingClientRect').mockReturnValue(rect(0, 40, 320, 800))
    vi.spyOn(centre, 'getBoundingClientRect').mockReturnValue(rect(0, 40, 1000, 800))
    const scope = overlayScope(root)
    if (scope === null) throw new Error('expected an overlay scope')
    expect(overlayBounds(scope)).toEqual({ left: 320, top: 40, width: 680, height: 800 })
    expect(frame.contains(sidebar)).toBe(true)
  })

  it('keeps the shell bottom row outside the canvas height', () => {
    const { centre, rightbar, root } = mountDom()
    vi.spyOn(centre, 'getBoundingClientRect').mockReturnValue(rect(280, 40, 420, 700))
    vi.spyOn(rightbar, 'getBoundingClientRect').mockReturnValue(rect(700, 40, 300, 700))
    const scope = overlayScope(root)
    if (scope === null) throw new Error('expected an overlay scope')
    expect(overlayBounds(scope)).toEqual({ left: 280, top: 40, width: 720, height: 700 })
  })

  it('returns null outside the shell overlay', () => {
    expect(overlayScope(document.createElement('div'))).toBeNull()
  })
})

describe('ViewerStore', () => {
  it('publishes open and close and restores focus', () => {
    const store = new ViewerStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const button = document.createElement('button')
    document.body.append(button)

    store.open({ kind: 'mermaid', title: 'Mermaid', source: 'flowchart TD\n A-->B', language: 'mermaid' }, button)
    expect(store.getSnapshot()?.request.source).toContain('flowchart')
    expect(listener).toHaveBeenCalledTimes(1)

    store.close()
    expect(store.getSnapshot()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(button)

    unsubscribe()
    button.remove()
  })

  it('is idempotent when closed twice', () => {
    const store = new ViewerStore()
    store.close()
    store.close()
    expect(store.getSnapshot()).toBeNull()
  })
})
