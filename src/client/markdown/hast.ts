/** Convert a HAST element's text content without depending on react-markdown internals. */
import type { Element, Root } from 'hast'

interface TextLike {
  readonly type: string
  readonly value?: string
  readonly children?: readonly TextLike[]
}

/**
 * Read the authored text of a HAST node.
 * @param node - element or root from react-markdown.
 * @returns concatenated text values.
 */
export function hastText(node: Element | Root | undefined): string {
  if (node === undefined) return ''
  let text = ''
  const walk = (current: TextLike): void => {
    if (current.type === 'text') {
      text += current.value ?? ''
      return
    }
    for (const child of current.children ?? []) walk(child)
  }
  walk(node as unknown as TextLike)
  return text
}

/**
 * Whether a HAST code node is a fenced/indented block rather than inline code.
 * The marker is added by the core rehype pass, so this does not rely on a
 * newline heuristic or on a removed react-markdown `inline` prop.
 * @param node - code element.
 * @returns true when the element is inside a `pre`.
 */
export function isCodeBlock(node: Element | undefined): boolean {
  const value = node?.properties?.dataCodeBlock
  return value === true || value === 'true'
}

/**
 * Read a fenced code language from a class attribute.
 * @param node - code element.
 * @param className - class attribute converted to a string.
 * @returns the normalized language, if present.
 */
export function codeLanguage(node: Element | undefined, className: string | undefined): string | undefined {
  const raw: unknown = node?.properties?.className
  const classes: string[] = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === 'string'
      ? raw.split(/\s+/u)
      : (className ?? '').split(/\s+/u)
  for (const name of classes) {
    const match = /^language-([\w+-]+)$/u.exec(name)
    if (match?.[1] !== undefined) return match[1].toLowerCase()
  }
  return undefined
}
