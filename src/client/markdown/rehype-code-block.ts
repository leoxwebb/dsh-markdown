/** Mark a code element as a block so component overrides do not guess from newlines. */
import type { Root } from 'hast'
import type { Transformer } from 'unified'

interface MutableNode {
  type?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: readonly MutableNode[]
}

/**
 * Return a rehype transformer that adds `dataCodeBlock` to every `pre > code`.
 * The pass is deliberately tiny instead of pulling `unist-util-visit` into the
 * bundle: the only tree shape it needs is the direct `pre` child.
 * @returns the transformer unified runs after the other rehype plugins.
 */
export function rehypeCodeBlockMarker(): Transformer<Root> {
  return (tree) => {
    const walk = (node: MutableNode | undefined): void => {
      if (node === undefined) return
      if (node.type === 'element' && node.tagName === 'pre') {
        for (const child of node.children ?? []) {
          if (child.type === 'element' && child.tagName === 'code') {
            child.properties = { ...child.properties, dataCodeBlock: 'true' }
          }
        }
      }
      for (const child of node.children ?? []) walk(child)
    }
    walk(tree as unknown as MutableNode)
  }
}
