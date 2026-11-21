/** Resolved pipeline shared by the document body and every component it renders. */
import type { Components } from 'react-markdown'
import type { PluggableList } from 'unified'
import type { ViewerStore } from '../overlay/viewer-store'
import type { ThemeStore } from '../theme'
import type { Translator } from '../types'
import type { FrontmatterRenderer, OverlayRenderer } from './extension'
import type { FenceRegistry } from './fence-registry'

/** Everything a document body needs from the extension graph. */
export interface MarkdownPipeline {
  readonly id: string
  readonly remarkPlugins: PluggableList
  readonly rehypePlugins: PluggableList
  readonly components: Components
  readonly fences: FenceRegistry
  readonly frontmatter: readonly FrontmatterRenderer[]
  readonly overlays: ReadonlyMap<string, OverlayRenderer>
  readonly urlTransform: (url: string) => string
}

/** Runtime services shared with renderer components through React context. */
export interface MarkdownServices {
  readonly pipeline: MarkdownPipeline
  readonly viewer: ViewerStore
  readonly themeStore: ThemeStore
  readonly t: Translator
  readonly wrap: boolean
  readonly absolutePath: string | undefined
  readonly streaming: boolean
}
