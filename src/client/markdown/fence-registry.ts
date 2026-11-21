/** Language-to-fence dispatch kept separate from React and the Markdown engine. */
import type { FenceRenderer } from './extension'

/** Normalize a fence language alias for lookup. */
export function normalizeLanguage(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Registry of fence renderers.
 *
 * A language can belong to one renderer only. Registering the same alias twice
 * is a wiring error rather than a silent last-wins, because two extensions that
 * both claim `mermaid` would make output depend on activation order.
 */
export class FenceRegistry {
  private readonly byLanguage = new Map<string, FenceRenderer>()

  /**
   * Register one renderer and all of its aliases.
   * @param renderer - renderer with at least one language.
   */
  register(renderer: FenceRenderer): void {
    if (renderer.languages.length === 0) {
      throw new Error(`dsh-markdown: fence "${renderer.id}" declares no languages`)
    }
    for (const language of renderer.languages) {
      const alias = normalizeLanguage(language)
      if (alias === '') throw new Error(`dsh-markdown: fence "${renderer.id}" has an empty language alias`)
      const existing = this.byLanguage.get(alias)
      if (existing !== undefined && existing.id !== renderer.id) {
        throw new Error(`dsh-markdown: language "${alias}" is claimed by both "${existing.id}" and "${renderer.id}"`)
      }
      this.byLanguage.set(alias, renderer)
    }
  }

  /**
   * Resolve a language alias to its renderer.
   * @param language - fence language, without `language-`.
   * @returns the renderer, if one is registered.
   */
  resolve(language: string | undefined): FenceRenderer | undefined {
    if (language === undefined) return undefined
    return this.byLanguage.get(normalizeLanguage(language))
  }

  /** Registered aliases, useful for diagnostics and tests. */
  languages(): readonly string[] {
    return [...this.byLanguage.keys()].sort()
  }
}
