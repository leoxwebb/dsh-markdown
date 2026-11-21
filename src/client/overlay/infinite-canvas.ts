/** Imperative pan/zoom controller for a rendered SVG; one instance per surface. */

const MIN_SCALE = 0.02
const MAX_SCALE = 16
const FIT_PADDING = 32
const PAN_STEP = 48

/** Controls wired by the canvas surface. */
export interface CanvasControls {
  readonly zoomIn: HTMLButtonElement | null
  readonly zoomOut: HTMLButtonElement | null
  readonly fit: HTMLButtonElement | null
  readonly readout: HTMLElement | null
}

interface Point {
  x: number
  y: number
}

interface Pinch {
  distance: number
  centerX: number
  centerY: number
  x: number
  y: number
  scale: number
}

/**
 * Attach drag, wheel, pinch, keyboard, and button zoom to a viewport.
 * @param viewport - clipping surface.
 * @param world - transformed wrapper containing the SVG.
 * @param svg - diagram root.
 * @param controls - optional toolbar controls.
 * @returns disposer removing every listener and observer.
 */
export function attachInfiniteCanvas(
  viewport: HTMLElement,
  world: HTMLElement,
  svg: SVGSVGElement,
  controls: CanvasControls,
): () => void {
  const doc = viewport.ownerDocument
  const win = doc.defaultView ?? window
  const controller = new AbortController()
  const { signal } = controller
  const clamp = (value: number): number => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value))
  let x = 0
  let y = 0
  let scale = 1
  let interacted = false
  let disposed = false
  let observer: ResizeObserver | null = null
  const pointers = new Map<number, Point>()
  let drag: Point | null = null
  let pinch: Pinch | null = null

  const intrinsic = (() => {
    const box = svg.viewBox.baseVal
    if (box.width > 0 && box.height > 0) return { width: box.width, height: box.height }
    try {
      const bounds = svg.getBBox()
      if (bounds.width > 0 && bounds.height > 0) return { width: bounds.width, height: bounds.height }
    } catch {
      // SVG not laid out yet; use its rendered rectangle.
    }
    const rect = svg.getBoundingClientRect()
    return { width: rect.width > 0 ? rect.width : 800, height: rect.height > 0 ? rect.height : 600 }
  })()

  const repaint = (): void => {
    const width = intrinsic.width * scale
    const height = intrinsic.height * scale
    world.style.transform = `translate(${x}px, ${y}px)`
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.style.width = `${width}px`
    svg.style.height = `${height}px`
    if (controls.readout !== null) controls.readout.textContent = `${Math.round(scale * 100)}%`
  }

  const fitView = (): void => {
    const rect = viewport.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const availableWidth = Math.max(1, rect.width - FIT_PADDING)
    const availableHeight = Math.max(1, rect.height - FIT_PADDING)
    scale = clamp(Math.min(availableWidth / intrinsic.width, availableHeight / intrinsic.height))
    x = (rect.width - intrinsic.width * scale) / 2
    y = (rect.height - intrinsic.height * scale) / 2
    repaint()
  }

  const zoomAt = (factor: number, clientX?: number, clientY?: number): void => {
    const rect = viewport.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top
    const next = clamp(scale * factor)
    if (next === scale) return
    x = px - (px - x) * (next / scale)
    y = py - (py - y) * (next / scale)
    scale = next
    interacted = true
    repaint()
  }

  const onZoomIn = (event: Event): void => {
    event.preventDefault()
    zoomAt(1.25)
  }
  const onZoomOut = (event: Event): void => {
    event.preventDefault()
    zoomAt(0.8)
  }
  const onFit = (event: Event): void => {
    event.preventDefault()
    interacted = false
    fitView()
  }
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    zoomAt(Math.exp(-delta * 0.0015), event.clientX, event.clientY)
  }
  const isControl = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest('[data-dsh-markdown-controls]') !== null
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (isControl(event.target)) return
    try {
      viewport.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is best-effort.
    }
    viewport.focus()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1) {
      drag = { x: event.clientX, y: event.clientY }
      pinch = null
      viewport.setAttribute('data-dragging', '')
    } else if (pointers.size === 2) {
      const points = [...pointers.values()]
      const first = points[0]
      const second = points[1]
      if (first === undefined || second === undefined) return
      const rect = viewport.getBoundingClientRect()
      pinch = {
        distance: Math.hypot(first.x - second.x, first.y - second.y) || 1,
        centerX: (first.x + second.x) / 2 - rect.left,
        centerY: (first.y + second.y) / 2 - rect.top,
        x,
        y,
        scale,
      }
      drag = null
    }
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1 && drag !== null) {
      x += event.clientX - drag.x
      y += event.clientY - drag.y
      drag = { x: event.clientX, y: event.clientY }
      interacted = true
      repaint()
    } else if (pointers.size === 2 && pinch !== null) {
      const points = [...pointers.values()]
      const first = points[0]
      const second = points[1]
      if (first === undefined || second === undefined) return
      const distance = Math.hypot(first.x - second.x, first.y - second.y) || 1
      const rect = viewport.getBoundingClientRect()
      const centerX = (first.x + second.x) / 2 - rect.left
      const centerY = (first.y + second.y) / 2 - rect.top
      const next = clamp(pinch.scale * (distance / pinch.distance))
      const worldX = (pinch.centerX - pinch.x) / pinch.scale
      const worldY = (pinch.centerY - pinch.y) / pinch.scale
      x = centerX - worldX * next
      y = centerY - worldY * next
      scale = next
      interacted = true
      repaint()
    }
  }
  const endPointer = (event: PointerEvent): void => {
    pointers.delete(event.pointerId)
    if (pointers.size === 0) {
      drag = null
      pinch = null
      viewport.removeAttribute('data-dragging')
    } else if (pointers.size === 1) {
      const point = [...pointers.values()][0]
      if (point !== undefined) drag = { x: point.x, y: point.y }
      pinch = null
    }
  }
  const onDoubleClick = (event: MouseEvent): void => {
    if (isControl(event.target)) return
    event.preventDefault()
    zoomAt(1.5, event.clientX, event.clientY)
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomAt(1.25)
    } else if (event.key === '-') {
      event.preventDefault()
      zoomAt(0.8)
    } else if (event.key === '0') {
      event.preventDefault()
      interacted = false
      fitView()
    } else if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault()
      if (event.key === 'ArrowLeft') x -= PAN_STEP
      else if (event.key === 'ArrowRight') x += PAN_STEP
      else if (event.key === 'ArrowUp') y -= PAN_STEP
      else y += PAN_STEP
      interacted = true
      repaint()
    }
  }
  const onResize = (): void => {
    if (!interacted) fitView()
  }

  viewport.addEventListener('wheel', onWheel, { passive: false, signal })
  viewport.addEventListener('pointerdown', onPointerDown, { signal })
  viewport.addEventListener('pointermove', onPointerMove, { signal })
  viewport.addEventListener('pointerup', endPointer, { signal })
  viewport.addEventListener('pointercancel', endPointer, { signal })
  viewport.addEventListener('lostpointercapture', endPointer, { signal })
  viewport.addEventListener('dblclick', onDoubleClick, { signal })
  viewport.addEventListener('keydown', onKeyDown, { signal })
  win.addEventListener('resize', onResize, { signal })
  if (typeof win.ResizeObserver === 'function') {
    observer = new win.ResizeObserver(onResize)
    observer.observe(viewport)
  }
  controls.zoomIn?.addEventListener('click', onZoomIn, { signal })
  controls.zoomOut?.addEventListener('click', onZoomOut, { signal })
  controls.fit?.addEventListener('click', onFit, { signal })
  fitView()
  win.requestAnimationFrame(() => {
    if (disposed) return
    if (!interacted) fitView()
  })

  return () => {
    disposed = true
    controller.abort()
    observer?.disconnect()
  }
}
