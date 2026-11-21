/** Code card shared by highlighted fences and fence-renderer fallbacks. */
// biome-ignore-all lint/a11y/noNoninteractiveTabindex: a scrollable code region must be keyboard reachable

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { copyText } from '../../clipboard'
import type { Translator } from '../../types'
import { useMarkdown } from '../context'

type CopyState = 'idle' | 'copied' | 'failed'

/** Inputs for one code block. */
export interface CodeBlockProps {
  readonly source: string
  readonly language: string | undefined
  readonly highlighted: ReactNode
  readonly t: Translator
}

/**
 * Render a fenced code block with a language banner, copy control, and the
 * highlighted children produced by rehype-highlight.
 * @param props - source, language, highlighted children, and locale.
 * @returns the code card.
 */
export function CodeBlock({ source, language, highlighted, t }: CodeBlockProps): ReactNode {
  const { wrap } = useMarkdown()
  const [copyState, setCopyState] = useState<CopyState>('idle')

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const label = language ?? t('code.language')
  const copy = (): void => {
    void copyText(source).then((ok) => setCopyState(ok ? 'copied' : 'failed'))
  }
  const copyLabel =
    copyState === 'copied' ? t('code.copied') : copyState === 'failed' ? t('code.copyFailed') : t('code.copy')
  const status = copyState === 'idle' ? '' : copyLabel

  return (
    <div className="dsh-md-code" data-language={language ?? ''}>
      <div className="dsh-md-code-head">
        <span className="dsh-md-code-lang">{label}</span>
        <button
          type="button"
          className="dsh-md-button"
          data-copy-state={copyState}
          aria-label={`${copyLabel}: ${label}`}
          onClick={copy}
        >
          {copyLabel}
        </button>
      </div>
      <section
        className="dsh-md-code-scroll"
        aria-label={`${t('code.region')}: ${label}`}
        tabIndex={0}
        data-wrap={wrap ? 'true' : 'false'}
      >
        <pre>
          <code className={language === undefined ? undefined : `hljs language-${language}`}>{highlighted}</code>
        </pre>
      </section>
      <span className="dsh-md-sr-only" aria-live="polite">
        {status}
      </span>
    </div>
  )
}
