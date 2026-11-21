/**
 * Browser half of @local/dsh-markdown.
 *
 * The plugin contributes through DSH's own extension points:
 * - a document-preview implementation for `.md`/`.markdown`, whose body renders
 *   a composed, extensible Markdown pipeline;
 * - a `shell.overlay` entry for the top-layer diagram canvas.
 * It registers no Chat slot and never observes or rewrites document DOM.
 */
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { defaultExtensions } from './extensions'
import { dictionaries } from './locales'
import { MarkdownDocument } from './markdown/MarkdownDocument'
import { createMarkdownPipeline } from './markdown/pipeline'
import { MarkdownOverlay } from './overlay/MarkdownOverlay'
import { ViewerStore } from './overlay/viewer-store'
import styles from './styles.css?inline'
import { createThemeStore } from './theme'
import type { ClientContext, DocumentBodyProps, Translator } from './types'

/** Locale namespace owned by this plugin. */
const NS = 'dshMarkdown'
/** Implementation identity shared by renderer metadata and its keyed body. */
const VIEWER_ID = '@local/dsh-markdown/markdown'
/** Root overlay entry id. */
const OVERLAY_ID = '@local/dsh-markdown/overlay'
/** Pipeline identity used in diagnostics and tests. */
export const PIPELINE_ID = '@local/dsh-markdown/pipeline'

/** Services this client plugin requires before activation. */
export const inject = ['slots', 'locale', 'theme', 'documentPreviews'] as const

/** Composed once: the extension graph is static for this bundle generation. */
export const pipeline = createMarkdownPipeline(defaultExtensions, { id: PIPELINE_ID })

// A DSH client plugin is a page singleton. The slot components stay at module
// level (stable React identity) and read the stores installed by the current
// activation; teardown clears them.
let activeViewer: ViewerStore | null = null
let activeTheme: ReturnType<typeof createThemeStore> | null = null
let activeTranslator: Translator | null = null

/** Document body registered for the keyed document slot. */
function MarkdownBody(props: DocumentBodyProps): ReactNode {
  // The overlay is root-scoped while the body is tab-scoped. Closing on a tab
  // or file change prevents an old document's canvas from covering the new one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a file/tab change must close the previous document's canvas even though the module store is not reactive.
  useEffect(() => () => activeViewer?.close(), [props.resourceAddress])
  if (activeViewer === null || activeTheme === null) return null
  return <MarkdownDocument {...props} pipeline={pipeline} viewer={activeViewer} themeStore={activeTheme} />
}

/** Overlay entry registered in the shell overlay slot. */
function Overlay(): ReactNode {
  if (activeViewer === null || activeTheme === null || activeTranslator === null) return null
  return <MarkdownOverlay store={activeViewer} themeStore={activeTheme} t={activeTranslator} pipeline={pipeline} />
}

/**
 * Register the Markdown renderer, its document body, the canvas overlay, and
 * plugin-owned resources for this activation.
 * @param ctx - client context carrying slots, locale, theme, and previews.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  const viewer = new ViewerStore()
  const themeStore = createThemeStore(ctx)
  activeViewer = viewer
  activeTheme = themeStore
  activeTranslator = t

  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-markdown: locale')
  ctx.effect(() => {
    const element = document.createElement('style')
    element.dataset.dshMarkdown = ''
    element.textContent = styles
    document.head.append(element)
    return () => element.remove()
  }, 'dsh-markdown: styles')

  ctx.effect(
    () =>
      ctx.documentPreviews.register({
        id: VIEWER_ID,
        extensions: ['md', 'markdown'],
        // The extension band makes this the default for new Markdown tabs;
        // the product renderer stays registered and remains selectable.
        priority: 'extension',
        title: () => t('viewer.label'),
        loading: 'text-pages',
        wrap: true,
        sourceLines: false,
      }),
    'dsh-markdown: renderer',
  )

  ctx.effect(
    () =>
      ctx.slots.inject('sidebar.right.tab.document', () =>
        ctx.slots.register({ name: 'sidebar.right.tab.document', key: VIEWER_ID, locale: NS }, MarkdownBody),
      ),
    'dsh-markdown: document body',
  )

  ctx.effect(
    () =>
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register({ name: 'shell.overlay', id: OVERLAY_ID, order: 20 }, Overlay),
      ),
    'dsh-markdown: canvas overlay',
  )

  ctx.effect(
    () => () => {
      viewer.close()
      if (activeViewer === viewer) activeViewer = null
      if (activeTheme === themeStore) activeTheme = null
      if (activeTranslator === t) activeTranslator = null
    },
    'dsh-markdown: teardown',
  )
}
