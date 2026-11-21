/**
 * Geometry for the top-layer canvas.
 *
 * The overlay lives in `shell.overlay`, which is a frame-sized layer covering
 * the whole application. The canvas must cover the centre column and the right
 * sidebar while leaving the left sidebar usable. A top-layer popover is
 * positioned against the viewport, so bounds are reported in viewport
 * coordinates rather than relative to the overlay layer.
 */

/** Frame-sized overlay layer and the AppFrame that owns the columns. */
export interface OverlayScope {
  readonly layer: HTMLElement
  readonly frame: HTMLElement
}

/** Canvas rectangle in viewport coordinates. */
export interface OverlayBounds {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/**
 * Find the frame-sized overlay layer and the AppFrame that owns the columns.
 * SlotOutlet inserts a `display: contents` anchor per entry, so the root's
 * direct parent is not the layer; `closest` is the stable lookup.
 * @param root - the overlay component root.
 * @returns the layer/frame pair, or null outside the shell overlay.
 */
export function overlayScope(root: HTMLElement): OverlayScope | null {
  const layer = root.closest('[data-shell-overlay]')
  const frame = layer?.parentElement
  if (!(layer instanceof HTMLElement) || !(frame instanceof HTMLElement)) return null
  return { layer, frame }
}

/** Space kept clear for the leading window controls when the sidebar collapses. */
const LEADING_CLEARANCE = 8

/**
 * Measure the canvas rectangle over the centre column and right sidebar.
 *
 * The left bound follows the visible sidebar column (or the leading controls
 * when that column is collapsed), so a drawer or collapsed sidebar is not
 * covered. The bottom bound follows the content columns, keeping the shell's
 * bottom row (terminal, jobs) outside the canvas.
 * @param scope - layer and frame found by {@link overlayScope}.
 * @returns viewport bounds, or null when the columns are not mounted.
 */
export function overlayBounds(scope: OverlayScope): OverlayBounds | null {
  const { frame } = scope
  if (!frame.isConnected) return null
  const rightbar = frame.querySelector('[data-rightbar-col]')
  const column = rightbar?.previousElementSibling
  const centre = column instanceof HTMLElement ? column : frame.querySelector('[data-conversation-content]')
  const frameRect = frame.getBoundingClientRect()
  if (!(centre instanceof HTMLElement)) return null

  const centreRect = centre.getBoundingClientRect()
  const rightbarRect = rightbar instanceof HTMLElement ? rightbar.getBoundingClientRect() : centreRect
  const sidebarRight =
    column instanceof HTMLElement ? (column.previousElementSibling?.getBoundingClientRect().right ?? 0) : 0
  const leading = frame.querySelector('[data-shell-leading]')
  const leadingRight = leading instanceof HTMLElement ? leading.getBoundingClientRect().right + LEADING_CLEARANCE : 0
  const left = Math.min(frameRect.right, Math.max(centreRect.left, sidebarRight, leadingRight))
  const bottom = Math.max(centreRect.bottom, rightbarRect.bottom)
  // Windows keeps its caption inside the frame as padding; leave that drag row
  // above the top-layer panel.
  const chromeTop = Number.parseFloat(window.getComputedStyle(frame).paddingTop) || 0
  const top = frameRect.top + chromeTop
  return {
    left,
    top,
    width: Math.max(0, frameRect.right - left),
    height: Math.max(0, bottom - top),
  }
}
