/** GitHub Flavored Markdown. */
import remarkGfm from 'remark-gfm'
import type { MarkdownExtension } from '../markdown/extension'

/** Tables, task lists, strikethrough, and autolinks. */
export const gfmExtension: MarkdownExtension = {
  id: 'gfm',
  remarkPlugins: [remarkGfm],
}
