/** highlight.js syntax highlighting through rehype-highlight. */
import rehypeHighlight from 'rehype-highlight'
import type { MarkdownExtension } from '../markdown/extension'

/** Fenced languages supported by highlight.js's common bundle. */
export const highlightExtension: MarkdownExtension = {
  id: 'highlight',
  rehypePlugins: [[rehypeHighlight, { detect: false }]],
}
