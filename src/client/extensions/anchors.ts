/** Stable heading ids so authored `#fragment` links can navigate the document. */
import rehypeSlug from 'rehype-slug'
import type { MarkdownExtension } from '../markdown/extension'

/** Adds GitHub-style heading ids without changing the rendered heading text. */
export const anchorsExtension: MarkdownExtension = {
  id: 'anchors',
  rehypePlugins: [rehypeSlug],
}
