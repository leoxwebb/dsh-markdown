/** Public extension contract for the Markdown pipeline. */
import type { ComponentType, ReactNode } from 'react'
import type { Components } from 'react-markdown'
import type { PluggableList } from 'unified'
import type { OverlayRequest, ViewerStore } from '../overlay/viewer-store'
import type { ThemeStore } from '../theme'
import type { Translator } from '../types'

/** Inputs available to a fence renderer. */
export interface FenceContext {
  readonly language: string
  readonly source: string
  readonly streaming: boolean
  readonly t: Translator
  readonly viewer: ViewerStore
  readonly themeStore: ThemeStore
}

/** One fenced-code renderer, selected by language alias. */
export interface FenceRenderer {
  readonly id: string
  /** Lower-case aliases, without the `language-` prefix. */
  readonly languages: readonly string[]
  /** Overlay kind this fence can open, if any. */
  readonly overlayKind?: string
  readonly Component: ComponentType<FenceContext>
}

/** Inputs available to a frontmatter renderer. */
export interface FrontmatterContext {
  readonly source: string
  readonly streaming: boolean
  readonly t: Translator
}

/** One frontmatter presentation; the first registered renderer wins. */
export interface FrontmatterRenderer {
  readonly id: string
  readonly Component: ComponentType<FrontmatterContext>
}

/** Inputs available to an overlay renderer. */
export interface OverlayRenderContext {
  readonly request: OverlayRequest
  readonly t: Translator
  readonly themeStore: ThemeStore
  readonly close: () => void
}

/** One top-layer visualization renderer, selected by request kind. */
export interface OverlayRenderer {
  readonly kind: string
  readonly Component: ComponentType<OverlayRenderContext>
}

/**
 * A composable Markdown capability.
 *
 * Extensions are composed once into a {@link MarkdownPipeline}; none of them
 * touches the document DOM, the Chat renderer, or another plugin's state.
 */
export interface MarkdownExtension {
  readonly id: string
  /** Plugins appended to the remark pipeline in registration order. */
  readonly remarkPlugins?: PluggableList
  /** Plugins appended to the rehype pipeline before the core block marker. */
  readonly rehypePlugins?: PluggableList
  /** React element overrides; later extensions win. */
  readonly components?: Components
  /** Fenced-code renderers, keyed by language alias. */
  readonly fences?: readonly FenceRenderer[]
  /** Frontmatter presentation; the first one wins. */
  readonly frontmatter?: FrontmatterRenderer
  /** Top-layer renderers, keyed by request kind. */
  readonly overlays?: readonly OverlayRenderer[]
  /** Additional URL policy, applied after the core safe-URL transform. */
  readonly urlTransform?: (url: string) => string
}

/** A renderer slot that may fall back to plain source when an extension throws. */
export interface RenderFallback {
  readonly fallback: ReactNode
}
