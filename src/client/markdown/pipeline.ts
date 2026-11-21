/**
 * Compose Markdown extensions into one resolved pipeline.
 *
 * The pipeline is built once per plugin activation and then read-only. Keeping
 * composition out of React makes the extension graph testable without a DOM and
 * keeps the document component focused on rendering.
 */
import type { Components } from 'react-markdown'
import type { PluggableList } from 'unified'
import { baseComponents } from './components/base'
import type { FrontmatterRenderer, MarkdownExtension, OverlayRenderer } from './extension'
import { FenceRegistry } from './fence-registry'
import type { MarkdownPipeline } from './pipeline-types'
import { rehypeCodeBlockMarker } from './rehype-code-block'
import { composeUrlTransforms, safeUrl } from './url'

/** Options accepted by {@link createMarkdownPipeline}. */
export interface PipelineOptions {
  /** Stable pipeline identity used in diagnostics and tests. */
  readonly id?: string
}

/**
 * Validate and compose the supplied extensions.
 * @param extensions - capabilities in precedence order.
 * @param options - pipeline identity.
 * @returns an immutable pipeline.
 */
export function createMarkdownPipeline(
  extensions: readonly MarkdownExtension[],
  options: PipelineOptions = {},
): MarkdownPipeline {
  const ids = new Set<string>()
  const fences = new FenceRegistry()
  const frontmatter: FrontmatterRenderer[] = []
  const overlays = new Map<string, OverlayRenderer>()
  const requiredOverlays = new Map<string, string>()
  const remarkPlugins: PluggableList = []
  const rehypePlugins: PluggableList = []
  const components: Components = { ...baseComponents }
  const transforms: ((url: string) => string)[] = [safeUrl]

  for (const extension of extensions) {
    if (ids.has(extension.id)) throw new Error(`dsh-markdown: duplicate extension id "${extension.id}"`)
    ids.add(extension.id)

    for (const fence of extension.fences ?? []) {
      fences.register(fence)
      if (fence.overlayKind !== undefined) requiredOverlays.set(fence.overlayKind, fence.id)
    }
    if (extension.frontmatter !== undefined) frontmatter.push(extension.frontmatter)
    for (const overlay of extension.overlays ?? []) {
      if (overlays.has(overlay.kind)) {
        throw new Error(`dsh-markdown: duplicate overlay kind "${overlay.kind}"`)
      }
      overlays.set(overlay.kind, overlay)
    }
    remarkPlugins.push(...(extension.remarkPlugins ?? []))
    rehypePlugins.push(...(extension.rehypePlugins ?? []))
    Object.assign(components, extension.components)
    if (extension.urlTransform !== undefined) transforms.push(extension.urlTransform)
  }

  // Mark block code after every extension so highlighting and custom rehype
  // plugins cannot erase the marker the code component depends on.
  rehypePlugins.push(rehypeCodeBlockMarker)

  for (const [kind, fenceId] of requiredOverlays) {
    if (!overlays.has(kind)) {
      throw new Error(`dsh-markdown: fence "${fenceId}" requires overlay "${kind}"`)
    }
  }

  const transformUrl = composeUrlTransforms(transforms)

  return Object.freeze({
    id: options.id ?? 'dsh-markdown',
    remarkPlugins: Object.freeze(remarkPlugins) as PluggableList,
    rehypePlugins: Object.freeze(rehypePlugins) as PluggableList,
    components,
    fences,
    frontmatter: Object.freeze(frontmatter.filter((value) => value !== undefined)),
    overlays,
    // Apply the policy again after extension transforms so a later extension
    // cannot reintroduce an executable scheme.
    urlTransform: (url: string) => safeUrl(transformUrl(url)),
  })
}
