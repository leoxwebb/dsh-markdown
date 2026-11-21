/** Markdown document renderer registered for `.md` and `.markdown` previews. */
// biome-ignore-all lint/a11y/noNoninteractiveTabindex: scrollable source blocks must be keyboard reachable
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { splitFrontmatter } from '../../shared/frontmatter'
import type { ViewerStore } from '../overlay/viewer-store'
import type { ThemeStore } from '../theme'
import { paletteStyle, useTheme } from '../theme'
import type { DocumentBodyProps } from '../types'
import { ExtensionBoundary } from './components/ExtensionBoundary'
import { MarkdownProvider } from './context'
import type { MarkdownPipeline } from './pipeline-types'

/** Plugin-owned services passed to the document body. */
export interface MarkdownDocumentProps extends DocumentBodyProps {
  readonly pipeline: MarkdownPipeline
  readonly themeStore: ThemeStore
  readonly viewer: ViewerStore
}

/**
 * Render one accumulated Markdown document.
 * @param props - document content, file metadata, pipeline, theme, and locale.
 * @returns the document body, or nothing for a non-text delivery.
 */
export function MarkdownDocument(props: MarkdownDocumentProps): ReactNode {
  const { content, resourceAddress, useResource, wrap, t, pipeline, themeStore, viewer } = props
  const theme = useTheme(themeStore)
  const absolutePath = useResource(resourceAddress).value?.absolutePath
  const text = content.kind === 'text' ? content.text : ''
  const streaming = content.kind === 'text' && !content.eof
  const split = useMemo(() => splitFrontmatter(text), [text])
  const themeStyle = useMemo(() => paletteStyle(theme), [theme])
  const services = useMemo(
    () => ({ pipeline, viewer, themeStore, t, wrap, absolutePath, streaming }),
    [pipeline, viewer, themeStore, t, wrap, absolutePath, streaming],
  )

  if (content.kind !== 'text') return null

  const Frontmatter = pipeline.frontmatter[0]?.Component
  const verbatim =
    split.source === null ? null : (
      <details className="dsh-md-frontmatter-panel">
        <summary>{t('frontmatter.label')}</summary>
        <pre className="dsh-md-frontmatter-source" tabIndex={0}>
          {split.source}
        </pre>
      </details>
    )

  return (
    <MarkdownProvider services={services}>
      <div
        className="dsh-md-doc"
        data-dsh-markdown=""
        data-theme={theme.active.colorScheme}
        data-streaming={streaming ? '' : undefined}
        data-theme-revision={theme.revision}
        style={themeStyle}
      >
        {split.source === null ? null : (
          <div className="dsh-md-frontmatter" data-frontmatter="">
            {Frontmatter === undefined ? (
              verbatim
            ) : (
              <ExtensionBoundary key={split.source} fallback={verbatim}>
                <Frontmatter source={split.source} streaming={streaming} t={t} />
              </ExtensionBoundary>
            )}
          </div>
        )}
        <ExtensionBoundary
          key={`${text.length}:${streaming ? 'streaming' : 'complete'}`}
          fallback={<pre className="dsh-md-source-fallback">{text}</pre>}
        >
          <ReactMarkdown
            remarkPlugins={pipeline.remarkPlugins}
            rehypePlugins={pipeline.rehypePlugins}
            components={pipeline.components}
            urlTransform={pipeline.urlTransform}
            skipHtml
          >
            {split.body}
          </ReactMarkdown>
        </ExtensionBoundary>
      </div>
    </MarkdownProvider>
  )
}
