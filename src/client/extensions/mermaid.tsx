/** Mermaid fences and their top-layer canvas. */
import type { MarkdownExtension } from '../markdown/extension'
import { MermaidCanvas } from '../mermaid/MermaidCanvas'
import { MermaidDiagram } from '../mermaid/MermaidDiagram'

/** Mermaid fence languages. Content sniffing is intentionally not used. */
export const MERMAID_LANGUAGES = ['mermaid', 'mmd', 'mermaid-js'] as const

/** Fence renderer plus the overlay kind it opens. */
export const mermaidExtension: MarkdownExtension = {
  id: 'mermaid',
  fences: [
    {
      id: 'mermaid',
      languages: MERMAID_LANGUAGES,
      overlayKind: 'mermaid',
      Component: MermaidDiagram,
    },
  ],
  overlays: [
    {
      kind: 'mermaid',
      Component: MermaidCanvas,
    },
  ],
}
