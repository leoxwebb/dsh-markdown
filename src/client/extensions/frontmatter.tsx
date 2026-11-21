/** Frontmatter presentation with a native disclosure and a verbatim fallback. */
// biome-ignore-all lint/a11y/noNoninteractiveTabindex: scrollable source blocks must be keyboard reachable

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { parse } from 'yaml'
import type { FrontmatterContext, MarkdownExtension } from '../markdown/extension'

type Metadata = Readonly<Record<string, unknown>>

/**
 * Parse the YAML block only when it is complete and structurally a mapping.
 * The block is parsed as soon as its closing delimiter has arrived, even while
 * later pages are still streaming.
 * @param source - YAML between the frontmatter delimiters.
 * @returns a mapping, or null when the block should stay verbatim.
 */
function metadataOf(source: string): Metadata | null {
  if (source.trim() === '') return null
  try {
    const value: unknown = parse(source)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Metadata
  } catch {
    return null
  }
}

/** Render a scalar as text and a structure as compact JSON. */
function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Render document metadata as a key/value list.
 * @param props - frontmatter source, streaming flag, and locale.
 * @returns the metadata panel or its verbatim source.
 */
function Frontmatter({ source, t }: FrontmatterContext): ReactNode {
  const metadata = useMemo(() => metadataOf(source), [source])
  if (metadata === null) {
    return (
      <details className="dsh-md-frontmatter-panel">
        <summary>{t('frontmatter.label')}</summary>
        <pre className="dsh-md-frontmatter-source" tabIndex={0}>
          {source}
        </pre>
      </details>
    )
  }
  const entries = Object.entries(metadata)
  if (entries.length === 0) return null
  return (
    <details className="dsh-md-frontmatter-panel">
      <summary>{t('frontmatter.label')}</summary>
      <dl>
        {entries.map(([key, value]) => (
          <div className="dsh-md-frontmatter-row" key={key}>
            <dt>{key}</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/** Built-in metadata extension. */
export const frontmatterExtension: MarkdownExtension = {
  id: 'frontmatter',
  frontmatter: {
    id: 'frontmatter-metadata',
    Component: Frontmatter,
  },
}
