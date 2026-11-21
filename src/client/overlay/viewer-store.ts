/** Root-scoped state for the single top-layer canvas overlay. */

/** One request for a top-layer visualization. */
export interface OverlayRequest {
  /** Overlay renderer kind; fences choose it through the pipeline registry. */
  readonly kind: string
  /** User-visible title for the overlay heading. */
  readonly title: string
  /** Source rendered by the overlay renderer. */
  readonly source: string
  /** Fence language that produced the request. */
  readonly language: string
}

/** One open overlay request. */
export interface ViewerState {
  readonly request: OverlayRequest
  readonly returnFocus: HTMLElement | null
}

/** Observable store shared by Markdown fence cards and the shell overlay entry. */
export class ViewerStore {
  private state: ViewerState | null = null
  private readonly listeners = new Set<() => void>()

  /** Stable snapshot reader for useSyncExternalStore. */
  readonly getSnapshot = (): ViewerState | null => this.state

  /**
   * Observe open/close changes.
   * @param listener - change callback.
   * @returns unsubscribe function.
   */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Open the overlay, remembering the trigger for focus return.
   * @param request - overlay kind and source.
   * @param returnFocus - element to focus when the overlay closes.
   */
  open(request: OverlayRequest, returnFocus: HTMLElement | null): void {
    this.state = { request, returnFocus }
    this.emit()
  }

  /** Close the overlay and restore focus when possible. */
  close(): void {
    const previous = this.state
    if (previous === null) return
    this.state = null
    this.emit()
    const active = typeof document === 'undefined' ? null : document.activeElement
    const focusWasInside = active instanceof Element && active.closest('[data-dsh-markdown-overlay]') !== null
    const focusWasIdle = active === null || active === document.body
    const target = previous.returnFocus
    if (target?.isConnected && (focusWasInside || focusWasIdle)) {
      // The covered columns are inert until React runs the overlay cleanup.
      // Retry after the commit so focus is not rejected by an inert ancestor.
      target.focus()
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!target.isConnected) return
          const current = document.activeElement
          const canRestore =
            current === null ||
            current === document.body ||
            (current instanceof Element && current.closest('[data-dsh-markdown-overlay]') !== null)
          if (canRestore && current !== target) target.focus()
        })
      }
    }
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener()
  }
}
