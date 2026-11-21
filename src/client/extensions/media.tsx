/** Local images and scrollable tables. */
// biome-ignore-all lint/a11y/noNoninteractiveTabindex: a scrollable table region must be keyboard reachable

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { useState } from 'react'
import type { ExtraProps } from 'react-markdown'
import { useMarkdown } from '../markdown/context'
import { markdownImageUrl } from '../markdown/images'

/** Resolve relative images beside the previewed file through DSH's file route. */
function MarkdownImage({ src, alt, node: _node, ...rest }: ComponentPropsWithoutRef<'img'> & ExtraProps): ReactNode {
  const { absolutePath, t } = useMarkdown()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolved = typeof src === 'string' ? markdownImageUrl(document.baseURI, absolutePath, src) : undefined
  const label = alt === undefined || alt === '' ? t('image.alt') : alt
  if (resolved === undefined || failedSrc === resolved) return <span className="dsh-md-image-alt">{label}</span>
  return (
    <img src={resolved} alt={label} loading="lazy" decoding="async" onError={() => setFailedSrc(resolved)} {...rest} />
  )
}

/** Keep wide GFM tables inside the document with a keyboard-reachable scroller. */
function MarkdownTable({ children }: ComponentPropsWithoutRef<'table'>): ReactNode {
  const { t } = useMarkdown()
  return (
    <section className="dsh-md-table" aria-label={t('table.label')} tabIndex={0}>
      <table>{children}</table>
    </section>
  )
}

/** Built-in media presentation. */
export const mediaExtension = {
  id: 'media',
  components: {
    img: MarkdownImage,
    table: MarkdownTable,
  },
} as const
