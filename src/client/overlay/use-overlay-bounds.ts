/** Measure the top-layer canvas against the live AppFrame columns. */

import type { RefObject } from 'react'
import { useLayoutEffect, useState } from 'react'
import type { OverlayBounds } from './geometry'
import { overlayBounds, overlayScope } from './geometry'

/** Measured geometry plus whether the host layout could not be identified. */
export interface OverlayGeometry {
  readonly bounds: OverlayBounds | null
  /** True when the canvas fell back to the whole window. */
  readonly degraded: boolean
}

const EMPTY: OverlayGeometry = { bounds: null, degraded: false }

/** Whole-window bounds used only when the AppFrame columns cannot be found. */
function viewportBounds(): OverlayBounds {
  return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
}

/**
 * Track the centre-column-plus-right-sidebar rectangle while the overlay is open.
 * @param root - overlay root inside `shell.overlay`.
 * @param open - whether the overlay is mounted.
 * @returns viewport bounds and whether the full-window fallback is active.
 */
export function useOverlayBounds(root: RefObject<HTMLElement | null>, open: boolean): OverlayGeometry {
  const [geometry, setGeometry] = useState<OverlayGeometry>(EMPTY)

  useLayoutEffect(() => {
    if (!open) {
      setGeometry(EMPTY)
      return
    }
    const element = root.current
    if (element === null) return
    const scope = overlayScope(element)
    if (scope === null) {
      // Never leave the user with a 0x0 invisible dialog. The fallback is
      // visibly labelled by the overlay host.
      setGeometry({ bounds: viewportBounds(), degraded: true })
      return
    }

    const update = (): void => {
      const next = overlayBounds(scope)
      if (next === null) {
        setGeometry((previous) =>
          previous.degraded && previous.bounds !== null ? previous : { bounds: viewportBounds(), degraded: true },
        )
        return
      }
      setGeometry((previous) =>
        previous.bounds !== null &&
        !previous.degraded &&
        previous.bounds.left === next.left &&
        previous.bounds.top === next.top &&
        previous.bounds.width === next.width &&
        previous.bounds.height === next.height
          ? previous
          : { bounds: next, degraded: false },
      )
    }

    update()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(scope.frame)
    const rightbar = scope.frame.querySelector('[data-rightbar-col]')
    const centre = rightbar?.previousElementSibling
    if (centre instanceof HTMLElement) observer?.observe(centre)
    if (rightbar instanceof HTMLElement) observer?.observe(rightbar)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [root, open])

  return geometry
}
