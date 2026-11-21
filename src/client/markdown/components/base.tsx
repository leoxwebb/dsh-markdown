/** Default element overrides; extensions may replace the presentational ones. */
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { ExtraProps } from 'react-markdown'
import { useMarkdown } from '../context'
import { codeLanguage, hastText, isCodeBlock } from '../hast'
import { CodeBlock } from './CodeBlock'
import { ExtensionBoundary } from './ExtensionBoundary'

type CodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps

/**
 * Dispatch fenced code to a registered fence renderer, otherwise render a code
 * card. Inline code keeps its authored class and never becomes a block.
 */
function MarkdownCode({ node, className, children, ...rest }: CodeProps): ReactNode {
  const { pipeline, t, viewer, themeStore, streaming } = useMarkdown()
  const block = isCodeBlock(node)
  const source = hastText(node) || String(children ?? '')
  const language = codeLanguage(node, className)

  if (!block) {
    return (
      <code className={className === undefined ? 'dsh-md-inline' : `dsh-md-inline ${className}`} {...rest}>
        {children}
      </code>
    )
  }

  const renderer = pipeline.fences.resolve(language)
  if (renderer !== undefined) {
    const Fence = renderer.Component
    return (
      <ExtensionBoundary
        key={`${renderer.id}:${source}`}
        fallback={<CodeBlock source={source} language={language} highlighted={children} t={t} />}
      >
        <Fence
          language={language ?? ''}
          source={source}
          streaming={streaming}
          t={t}
          viewer={viewer}
          themeStore={themeStore}
        />
      </ExtensionBoundary>
    )
  }

  return <CodeBlock source={source} language={language} highlighted={children} t={t} />
}

/** Code cards render their own `pre`, so the default wrapper is a pass-through. */
function MarkdownPre({ children }: ComponentPropsWithoutRef<'pre'>): ReactNode {
  return <>{children}</>
}

/** Links keep URL navigation; external targets open in a new context safely. */
function MarkdownAnchor({
  href,
  children,
  node: _node,
  ...rest
}: ComponentPropsWithoutRef<'a'> & ExtraProps): ReactNode {
  const external = typeof href === 'string' && /^https?:/iu.test(href)
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {children}
    </a>
  )
}

/** Authored images always carry alt text; local resolution is a media extension. */
function MarkdownImage({ src, alt, node: _node, ...rest }: ComponentPropsWithoutRef<'img'> & ExtraProps): ReactNode {
  return <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" {...rest} />
}

/** Tables are wrapped for horizontal scrolling by the media extension. */
function MarkdownTable({ children }: ComponentPropsWithoutRef<'table'>): ReactNode {
  return <table>{children}</table>
}

/** Presentational overrides installed before any extension. */
export const baseComponents = {
  code: MarkdownCode,
  pre: MarkdownPre,
  a: MarkdownAnchor,
  img: MarkdownImage,
  table: MarkdownTable,
} as const
