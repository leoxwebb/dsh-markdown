/** Built-in capabilities composed by the plugin's single pipeline. */
import type { MarkdownExtension } from '../markdown/extension'
import { anchorsExtension } from './anchors'
import { frontmatterExtension } from './frontmatter'
import { gfmExtension } from './gfm'
import { highlightExtension } from './highlight'
import { mediaExtension } from './media'
import { mermaidExtension } from './mermaid'

/**
 * Default extension order.
 *
 * Adding a capability means implementing {@link MarkdownExtension} and appending
 * it here; the Markdown component, document body, and overlay host do not need
 * to change. `mermaid` stays last because it owns both a fence and an overlay.
 */
export const defaultExtensions: readonly MarkdownExtension[] = [
  gfmExtension,
  anchorsExtension,
  highlightExtension,
  frontmatterExtension,
  mediaExtension,
  mermaidExtension,
]
