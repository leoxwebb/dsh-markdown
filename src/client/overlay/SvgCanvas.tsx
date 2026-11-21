/** Infinite SVG canvas used by the Mermaid overlay renderer. */
// biome-ignore-all lint/a11y/noNoninteractiveTabindex: the viewport is a keyboard-operable application surface
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { renderMermaid } from '../mermaid/runtime'
import type { ThemeStore } from '../theme'
import { useTheme } from '../theme'
import type { Translator } from '../types'
import { attachInfiniteCanvas } from './infinite-canvas'
import type { OverlayRequest } from './viewer-store'

/** Inputs for one diagram canvas. */
export interface SvgCanvasProps {
  readonly request: OverlayRequest
  readonly t: Translator
  readonly themeStore: ThemeStore
}

/**
 * Render a Mermaid source into a pannable, zoomable SVG viewport.
 * @param props - overlay request, locale, and theme.
 * @returns the canvas surface.
 */
export function SvgCanvas({ request, t, themeStore }: SvgCanvasProps): ReactNode {
  const theme = useTheme(themeStore)
  const hintId = useId()
  const viewport = useRef<HTMLDivElement | null>(null)
  const world = useRef<HTMLDivElement | null>(null)
  const zoomIn = useRef<HTMLButtonElement | null>(null)
  const zoomOut = useRef<HTMLButtonElement | null>(null)
  const fit = useRef<HTMLButtonElement | null>(null)
  const readout = useRef<HTMLSpanElement | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    void renderMermaid(request.source, theme).then(
      (result) => {
        if (!cancelled) setSvg(result)
      },
      (reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
    return () => {
      cancelled = true
    }
  }, [request.source, theme])

  useEffect(() => {
    if (world.current === null) return
    if (svg === null) {
      world.current.replaceChildren()
      return
    }
    // The Mermaid runtime sanitizes this SVG with DOMPurify before insertion.
    world.current.innerHTML = svg
    if (viewport.current === null) return
    const svgElement = world.current.querySelector('svg')
    if (!(svgElement instanceof SVGSVGElement)) return
    svgElement.setAttribute('role', 'img')
    svgElement.setAttribute('aria-label', request.title || t('overlay.canvas'))
    if (svgElement.querySelector('title') === null) {
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = request.title || t('overlay.canvas')
      svgElement.prepend(title)
    }
    return attachInfiniteCanvas(viewport.current, world.current, svgElement, {
      zoomIn: zoomIn.current,
      zoomOut: zoomOut.current,
      fit: fit.current,
      readout: readout.current,
    })
  }, [svg, request.title, t])

  return (
    <div className="dsh-md-canvas">
      {error === null ? null : (
        <p className="dsh-md-error" role="alert">
          {t('diagram.error')}
          {'\n'}
          {error}
        </p>
      )}
      {error === null && svg === null ? <div className="dsh-md-message">{t('diagram.loading')}</div> : null}
      <div
        ref={viewport}
        className="dsh-md-canvas-viewport"
        role="application"
        aria-label={t('overlay.canvas')}
        aria-describedby={hintId}
        tabIndex={0}
      >
        <div ref={world} className="dsh-md-canvas-world" hidden={svg === null} />
        <div className="dsh-md-canvas-controls" data-dsh-markdown-controls>
          <button
            ref={zoomOut}
            type="button"
            className="dsh-md-button"
            aria-label={t('overlay.zoomOut')}
            disabled={svg === null}
          >
            −
          </button>
          <span ref={readout} className="dsh-md-readout">
            100%
          </span>
          <button
            ref={zoomIn}
            type="button"
            className="dsh-md-button"
            aria-label={t('overlay.zoomIn')}
            disabled={svg === null}
          >
            +
          </button>
          <button ref={fit} type="button" className="dsh-md-button" disabled={svg === null}>
            {t('overlay.fit')}
          </button>
        </div>
        <p id={hintId} className="dsh-md-canvas-hint">
          {t('overlay.hint')}
        </p>
      </div>
    </div>
  )
}
