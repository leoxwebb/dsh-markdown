/** One Mermaid fenced block: rendered SVG, source, copy, and canvas entry. */
// biome-ignore-all lint/a11y/noNoninteractiveTabindex: scrollable source blocks must be keyboard reachable
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { copyText } from '../clipboard'
import type { FenceContext } from '../markdown/extension'
import { useTheme } from '../theme'
import { renderMermaid } from './runtime'

/**
 * Render a Mermaid source and expose Source, Copy, and Open canvas actions.
 * While the document is streaming, rendering waits briefly so a half-written
 * fence does not animate an error state on every keystroke.
 * @param props - fence source, streaming flag, locale, canvas store, and theme.
 * @returns the diagram card.
 */
export function MermaidDiagram({ source, streaming, t, viewer, themeStore }: FenceContext): ReactNode {
  const theme = useTheme(themeStore)
  const [svg, setSvg] = useState<string | null>(null)
  const body = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    let cancelled = false
    setError(null)
    const timer = window.setTimeout(
      () => {
        void renderMermaid(source, theme).then(
          (result) => {
            if (!cancelled) setSvg(result)
          },
          (reason: unknown) => {
            if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
          },
        )
      },
      streaming ? 320 : 0,
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source, theme, streaming])

  useEffect(() => {
    if (body.current === null) return
    if (svg === null) {
      body.current.replaceChildren()
      return
    }
    // The runtime sanitizes the SVG with DOMPurify before this DOM write.
    body.current.innerHTML = svg
    const svgElement = body.current.querySelector('svg')
    if (svgElement === null) return
    svgElement.setAttribute('role', 'img')
    svgElement.setAttribute('aria-label', t('diagram.label'))
    if (svgElement.querySelector('title') === null) {
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = t('diagram.label')
      svgElement.prepend(title)
    }
  }, [svg, t])

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const copy = (): void => {
    void copyText(source).then((ok) => setCopyState(ok ? 'copied' : 'failed'))
  }
  const copyLabel =
    copyState === 'copied' ? t('diagram.copied') : copyState === 'failed' ? t('diagram.copyFailed') : t('diagram.copy')

  return (
    <figure className="dsh-md-diagram">
      <figcaption className="dsh-md-sr-only">{t('diagram.label')}</figcaption>
      <div className="dsh-md-toolbar">
        <span>{t('diagram.label')}</span>
        <div className="dsh-md-actions">
          <button
            type="button"
            className="dsh-md-button"
            aria-expanded={showSource}
            onClick={() => setShowSource((value) => !value)}
          >
            {showSource ? t('diagram.hideSource') : t('diagram.source')}
          </button>
          <button type="button" className="dsh-md-button" onClick={copy}>
            {copyLabel}
          </button>
          <button
            type="button"
            className="dsh-md-button"
            onClick={(event) =>
              viewer.open(
                {
                  kind: 'mermaid',
                  title: t('diagram.label'),
                  source,
                  language: 'mermaid',
                },
                event.currentTarget,
              )
            }
          >
            {t('diagram.fullscreen')}
          </button>
        </div>
      </div>
      {error !== null ? (
        <div>
          <p className="dsh-md-error" role="alert">
            {t('diagram.error')}
            {'\n'}
            {error}
          </p>
          <pre className="dsh-md-source" tabIndex={0}>
            {source}
          </pre>
        </div>
      ) : svg === null ? (
        <div className="dsh-md-message">{t('diagram.loading')}</div>
      ) : (
        <div ref={body} className="dsh-md-diagram-body" />
      )}
      {showSource ? (
        <pre className="dsh-md-source" tabIndex={0}>
          {source}
        </pre>
      ) : null}
      <span className="dsh-md-sr-only" aria-live="polite">
        {copyState === 'copied' ? t('diagram.copied') : copyState === 'failed' ? t('diagram.copyFailed') : ''}
      </span>
    </figure>
  )
}
