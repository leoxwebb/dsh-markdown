/** Overlay renderer that presents a Mermaid request on the infinite canvas. */
import type { ReactNode } from 'react'
import type { OverlayRenderContext } from '../markdown/extension'
import { SvgCanvas } from '../overlay/SvgCanvas'

/**
 * Bind the generic SVG canvas to a Mermaid overlay request.
 * @param props - request, locale, and theme.
 * @returns the canvas surface.
 */
export function MermaidCanvas({ request, t, themeStore }: OverlayRenderContext): ReactNode {
  return <SvgCanvas request={request} t={t} themeStore={themeStore} />
}
