/** React context carrying the resolved pipeline and per-document services. */

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import type { MarkdownServices } from './pipeline-types'

const MarkdownContext = createContext<MarkdownServices | null>(null)

/** Provide the document's pipeline and services to every component override. */
export function MarkdownProvider({
  services,
  children,
}: {
  readonly services: MarkdownServices
  readonly children: ReactNode
}): ReactNode {
  return <MarkdownContext.Provider value={services}>{children}</MarkdownContext.Provider>
}

/**
 * Read the enclosing document services.
 * @returns pipeline, stores, locale, and document flags.
 */
export function useMarkdown(): MarkdownServices {
  const value = useContext(MarkdownContext)
  if (value === null) throw new Error('dsh-markdown: Markdown context is missing')
  return value
}
