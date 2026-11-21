/** Isolate one extension renderer so a malformed block cannot break the document. */

import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface ExtensionBoundaryProps {
  readonly children: ReactNode
  readonly fallback: ReactNode
}

interface ExtensionBoundaryState {
  readonly failed: boolean
}

/**
 * Render a fallback when a fence, frontmatter, or overlay component throws.
 * The boundary is keyed by source so editing the block retries rendering.
 */
export class ExtensionBoundary extends Component<ExtensionBoundaryProps, ExtensionBoundaryState> {
  override state: ExtensionBoundaryState = { failed: false }

  static getDerivedStateFromError(): ExtensionBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[dsh-markdown] extension renderer failed', error, info.componentStack)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
