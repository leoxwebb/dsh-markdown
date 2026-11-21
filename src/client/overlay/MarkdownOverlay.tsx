/** Top-layer, non-modal canvas host registered in the shell overlay slot. */
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { ExtensionBoundary } from '../markdown/components/ExtensionBoundary'
import type { MarkdownPipeline } from '../markdown/pipeline-types'
import type { ThemeStore } from '../theme'
import { paletteStyle, useTheme } from '../theme'
import type { Translator } from '../types'
import { useOverlayBounds } from './use-overlay-bounds'
import type { ViewerState, ViewerStore } from './viewer-store'

/** Inputs for the single overlay host. */
export interface MarkdownOverlayProps {
  readonly store: ViewerStore
  readonly themeStore: ThemeStore
  readonly t: Translator
  readonly pipeline: MarkdownPipeline
}

/**
 * Host the selected overlay renderer in a native popover dialog.
 *
 * `<dialog popover="manual">` puts the canvas in the browser's top layer while
 * keeping the page interactive, so the left Sidebar stays usable and the right
 * Sidebar is covered. `showPopover()` is feature-detected; without it the
 * dialog keeps a fixed, high-z-index fallback.
 * @param props - store, theme, locale, and overlay registry.
 * @returns the overlay, or nothing while closed.
 */
export function MarkdownOverlay({ store, themeStore, t, pipeline }: MarkdownOverlayProps): ReactNode {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const theme = useTheme(themeStore)
  const palette = useMemo(() => paletteStyle(theme), [theme])
  const dialog = useRef<HTMLDialogElement | null>(null)
  const focusedState = useRef<ViewerState | null>(null)
  const titleId = useId()
  const { bounds, degraded } = useOverlayBounds(dialog, state !== null)

  useLayoutEffect(() => {
    if (state === null) return
    const element = dialog.current
    if (element === null) return
    let shown = false
    if (typeof element.showPopover === 'function') {
      try {
        element.showPopover()
        shown = true
      } catch {
        // A detached or already-open dialog falls back to fixed positioning.
      }
    }
    if (!shown) element.setAttribute('data-fallback-open', '')
    return () => {
      element.removeAttribute('data-fallback-open')
      if (!shown) return
      try {
        if (element.matches(':popover-open')) element.hidePopover()
      } catch {
        // The element may already be disconnected.
      }
    }
  }, [state])

  useEffect(() => {
    if (state === null) {
      focusedState.current = null
      return
    }
    if (bounds === null || focusedState.current === state) return
    focusedState.current = state
    const viewport = dialog.current?.querySelector<HTMLElement>('[role="application"]')
    viewport?.focus()
  }, [state, bounds])

  useEffect(() => {
    if (state === null) return
    const frame = dialog.current?.closest('[data-shell-overlay]')?.parentElement
    if (!(frame instanceof HTMLElement)) return
    const rightbar = frame.querySelector('[data-rightbar-col]')
    const centre = rightbar?.previousElementSibling
    const targets = [centre, rightbar].filter((element): element is HTMLElement => element instanceof HTMLElement)
    const hadInert = targets.map((element) => element.hasAttribute('inert'))
    for (const element of targets) element.setAttribute('inert', '')
    return () => {
      targets.forEach((element, index) => {
        if (!hadInert[index]) element.removeAttribute('inert')
      })
    }
  }, [state])

  if (state === null) return null
  const Overlay = pipeline.overlays.get(state.request.kind)?.Component

  const style: CSSProperties = {
    ...palette,
    left: `${bounds?.left ?? 0}px`,
    top: `${bounds?.top ?? 0}px`,
    width: `${bounds?.width ?? 0}px`,
    height: `${bounds?.height ?? 0}px`,
    visibility: bounds === null ? 'hidden' : 'visible',
  }

  return (
    <dialog
      ref={dialog}
      className="dsh-md-overlay"
      data-dsh-markdown-overlay=""
      aria-labelledby={titleId}
      data-theme={theme.active.colorScheme}
      style={style}
      {...({ popover: 'manual' } as { popover: string })}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        store.close()
      }}
    >
      <header className="dsh-md-overlay-head">
        <h2 id={titleId} className="dsh-md-overlay-title">
          {state.request.title || t('overlay.title')}
        </h2>
        {degraded ? (
          <span className="dsh-md-overlay-note" role="status">
            {t('overlay.degraded')}
          </span>
        ) : null}
        <button type="button" className="dsh-md-button" onClick={() => store.close()}>
          {t('overlay.close')}
        </button>
      </header>
      <div className="dsh-md-overlay-body">
        {Overlay === undefined ? (
          <p className="dsh-md-error" role="alert">
            {t('extension.error')}
          </p>
        ) : (
          <ExtensionBoundary
            fallback={
              <p className="dsh-md-error" role="alert">
                {t('extension.error')}
              </p>
            }
          >
            <Overlay request={state.request} t={t} themeStore={themeStore} close={() => store.close()} />
          </ExtensionBoundary>
        )}
      </div>
    </dialog>
  )
}
