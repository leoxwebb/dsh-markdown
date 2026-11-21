/** Minimal contracts consumed from the running DSH client; kept local so the bundle stays version-tolerant. */
import type { ComponentType } from 'react'

/** Localized lookup function passed to a locale-bound slot. */
export type Translator = (key: string, variables?: Record<string, string | number>) => string

/** Dictionaries registered for this plugin's locale namespace. */
export type LocaleDictionaries = Readonly<Record<string, Readonly<Record<string, string>>>>

/** Locale registration and binding surface. */
export interface LocaleService {
  register(namespace: string, dictionaries: LocaleDictionaries): () => void
  bind(namespace: string): Translator
}

/** One accumulated text page from the document owner. */
export interface DocumentTextPage {
  readonly offset: number
  readonly text: string
  readonly lines: number
}

/** Content supplied by the sidebar document owner. */
export type DocumentContent =
  | {
      readonly kind: 'text'
      readonly text: string
      readonly pages: readonly DocumentTextPage[]
      readonly eof: boolean
    }
  | { readonly kind: 'bytes'; readonly data: Uint8Array<ArrayBuffer> }
  | {
      readonly kind: 'renderer'
      readonly revision: number
      readonly loaded: (version: string) => void
      readonly failed: () => void
      readonly reload: () => void
    }

/** File metadata read through the standard resource hook. */
export interface FileResourceValue {
  readonly absolutePath?: string
}

/** Standard props received by a `sidebar.right.tab.document` body. */
export interface DocumentBodyProps {
  readonly content: DocumentContent
  readonly resourceAddress: string
  readonly wrap: boolean
  readonly scrollportRef: (element: HTMLElement | null) => void
  readonly addResource?: (address: string) => void
  readonly setResources?: (addresses: readonly string[]) => void
  readonly useResource: (address: string) => { readonly value?: FileResourceValue }
  readonly t: Translator
}

/** Metadata registered for a document renderer. */
export interface DocumentPreviewDefinition {
  readonly id: string
  readonly extensions: readonly string[]
  readonly binaryExtensions?: readonly string[]
  readonly priority?: 'builtin' | 'extension'
  readonly title: () => string
  readonly loading: 'text-pages' | 'bytes-complete' | 'renderer'
  readonly wrap?: boolean
  readonly sourceLines?: boolean
}

/** Document preview registry surface. */
export interface DocumentPreviewsService {
  register(definition: DocumentPreviewDefinition): () => void
}

/** One module/plugin registration option bag. */
export interface SlotRegistrationOptions {
  readonly name: string
  readonly key?: string
  readonly id?: string
  readonly locale?: string
  readonly order?: number
}

/** Slot service surface used by this plugin. */
export interface SlotsService {
  inject(name: string, factory: () => () => void): () => void
  register<P>(options: SlotRegistrationOptions, component: ComponentType<P>): () => void
}

/** Active theme definition. */
export interface ThemeDefinition {
  readonly colorScheme: 'light' | 'dark'
  readonly tokens: Readonly<Record<string, string>>
}

/** Immutable theme snapshot published by the host theme service. */
export interface ThemeSnapshot {
  readonly active: ThemeDefinition
  readonly revision: number
}

/** Theme service surface. */
export interface ThemeService {
  getTheme(): ThemeSnapshot
}

/** Client context surface used by this plugin. */
export interface ClientContext {
  readonly locale: LocaleService
  readonly slots: SlotsService
  readonly documentPreviews: DocumentPreviewsService
  readonly theme: ThemeService
  effect(callback: () => () => void, label?: string): void
  on(event: string, listener: (...args: never[]) => void): () => void
}

/** Client plugin object returned by the module-loader factory. */
export interface ClientPlugin {
  readonly inject: readonly string[]
  apply(ctx: ClientContext): void
}
