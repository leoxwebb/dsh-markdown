/**
 * Split a leading YAML frontmatter block from a Markdown document.
 *
 * The built-in DSH preview accepts `---` or `...` as the closing delimiter and
 * leaves an unterminated block in the Markdown body. Matching that behavior
 * keeps the renderer stable while a file is still streaming.
 */

/** Largest frontmatter block parsed as metadata; larger blocks stay in the body. */
const MAX_FRONTMATTER_LENGTH = 64_000

/** One document split at the frontmatter boundaries. */
export interface FrontmatterSplit {
  /** YAML between the delimiters, or null when the document has none. */
  readonly source: string | null
  /** The Markdown after the frontmatter block. */
  readonly body: string
}

const OPENING = /^---[ \t]*\r?\n/u
const COMPLETE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/u

/**
 * Separate frontmatter without modifying the authored body.
 * @param text - accumulated document text.
 * @returns the frontmatter source and the remaining Markdown.
 */
export function splitFrontmatter(text: string): FrontmatterSplit {
  const value = text.startsWith('\uFEFF') ? text.slice(1) : text
  if (!OPENING.test(value)) return { source: null, body: text }
  const match = COMPLETE.exec(value)
  if (match === null) return { source: null, body: text }
  const source = match[1] ?? ''
  if (source.length > MAX_FRONTMATTER_LENGTH) return { source: null, body: text }
  return { source, body: value.slice(match[0].length) }
}
