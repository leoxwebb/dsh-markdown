/** Theme adapter: DSH publishes CSS tokens; Mermaid needs literal palette values. */
import { useSyncExternalStore } from 'react'
import type { ClientContext, ThemeSnapshot } from './types'

/** Observable theme snapshot consumed by React via useSyncExternalStore. */
export interface ThemeStore {
  getSnapshot(): ThemeSnapshot
  subscribe(listener: () => void): () => void
}

/**
 * Bind the host theme service to a stable external store.
 * @param ctx - client context owning the theme service.
 * @returns snapshot reader and change subscription.
 */
export function createThemeStore(ctx: ClientContext): ThemeStore {
  return {
    getSnapshot: () => ctx.theme.getTheme(),
    subscribe: (listener) => ctx.on('theme/change', listener),
  }
}

/** Resolved colors and fonts used by the renderer and its canvas. */
export interface Palette {
  readonly background: string
  readonly foreground: string
  readonly muted: string
  readonly border: string
  readonly surface: string
  readonly surfaceRaised: string
  readonly brand: string
  readonly danger: string
  readonly codeBackground: string
  readonly codeBanner: string
  readonly inlineCode: string
  readonly scrollThumb: string
  readonly scrollThumbHover: string
  readonly fontFamily: string
  readonly fontMono: string
}

const LIGHT: Palette = {
  background: '#ffffff',
  foreground: '#0f1115',
  muted: '#61666b',
  border: 'rgba(0, 0, 0, 0.12)',
  surface: '#f9fafb',
  surfaceRaised: '#ffffff',
  brand: '#4868b2',
  danger: '#570c0c',
  codeBackground: '#f9fafb',
  codeBanner: '#f1f3f5',
  inlineCode: '#f5f5f5',
  scrollThumb: '#d4d4d4',
  scrollThumbHover: '#a2a4a6',
  fontFamily: 'system-ui, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

const DARK: Palette = {
  background: '#151517',
  foreground: '#f9fafb',
  muted: '#cfd3d6',
  border: 'rgba(255, 255, 255, 0.14)',
  surface: '#232324',
  surfaceRaised: '#29292b',
  brand: '#7aaaff',
  danger: '#f25a5a',
  codeBackground: '#1b1b1c',
  codeBanner: '#232324',
  inlineCode: '#292929',
  scrollThumb: '#3c3c3d',
  scrollThumbHover: '#545557',
  fontFamily: 'system-ui, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

/**
 * Read the resolved palette from the document tokens.
 * @param snapshot - current theme snapshot.
 * @returns literal colors and font families for Mermaid and canvas chrome.
 */
export function readPalette(snapshot: ThemeSnapshot): Palette {
  const fallback = snapshot.active.colorScheme === 'dark' ? DARK : LIGHT
  if (typeof document === 'undefined' || document.body === null) return fallback
  const style = getComputedStyle(document.body)
  const value = (name: string, fallbackValue: string): string => {
    const override = snapshot.active.tokens[name]
    if (override !== undefined && override !== '') return override
    const resolved = style.getPropertyValue(name).trim()
    return resolved === '' ? fallbackValue : resolved
  }
  const dark = snapshot.active.colorScheme === 'dark'
  return {
    background: value('--dsw-alias-bg-base', fallback.background),
    foreground: value('--dsw-alias-label-primary', fallback.foreground),
    muted: value('--dsw-alias-label-secondary', fallback.muted),
    border: value('--dsw-alias-border-l2', fallback.border),
    surface: value('--dsw-alias-bg-layer-1', fallback.surface),
    surfaceRaised: value('--dsw-alias-bg-layer-2', fallback.surfaceRaised),
    brand: value(dark ? '--dsw-alias-link' : '--dsw-static-deepseek-600', fallback.brand),
    danger: value(dark ? '--dsw-alias-state-error-primary' : '--dsw-static-red-900', fallback.danger),
    codeBackground: value('--dsw-alias-markdown-code-block', fallback.codeBackground),
    codeBanner: value('--dsw-alias-markdown-code-block-banner', fallback.codeBanner),
    inlineCode: value('--dsw-alias-markdown-inline-code', fallback.inlineCode),
    scrollThumb: value('--dsw-alias-scrollbar-bg-l1', fallback.scrollThumb),
    scrollThumbHover: value('--dsw-alias-scrollbar-hover-l1', fallback.scrollThumbHover),
    fontFamily: style.fontFamily || fallback.fontFamily,
    fontMono: value('--ds-font-family-code', fallback.fontMono),
  }
}

/**
 * Mermaid theme variables for the active DSH palette.
 * @param snapshot - current theme snapshot.
 * @returns Mermaid `themeVariables` map.
 */
export function mermaidThemeVariables(snapshot: ThemeSnapshot): Record<string, string> {
  const palette = readPalette(snapshot)
  return {
    background: palette.background,
    primaryColor: palette.surface,
    primaryTextColor: palette.foreground,
    primaryBorderColor: palette.border,
    secondaryColor: palette.surfaceRaised,
    tertiaryColor: palette.background,
    lineColor: palette.muted,
    textColor: palette.foreground,
    mainBkg: palette.surface,
    nodeBorder: palette.border,
    clusterBkg: palette.surface,
    clusterBorder: palette.border,
    edgeLabelBackground: palette.background,
    fontFamily: palette.fontFamily,
    fontSize: '14px',
  }
}

/** CSS custom properties used by the document renderer and overlay. */
export function paletteStyle(snapshot: ThemeSnapshot): Record<string, string> {
  const palette = readPalette(snapshot)
  return {
    '--dsh-md-bg': palette.background,
    '--dsh-md-fg': palette.foreground,
    '--dsh-md-muted': palette.muted,
    '--dsh-md-border': palette.border,
    '--dsh-md-surface': palette.surface,
    '--dsh-md-surface-raised': palette.surfaceRaised,
    '--dsh-md-brand': palette.brand,
    '--dsh-md-danger': palette.danger,
    '--dsh-md-code-bg': palette.codeBackground,
    '--dsh-md-code-banner': palette.codeBanner,
    '--dsh-md-inline-code': palette.inlineCode,
    '--dsh-md-scroll-thumb': palette.scrollThumb,
    '--dsh-md-scroll-thumb-hover': palette.scrollThumbHover,
    '--dsh-md-font': palette.fontFamily,
    '--dsh-md-mono': palette.fontMono,
  }
}

/** Subscribe a component to the host theme snapshots. */
export function useTheme(store: ThemeStore): ThemeSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
