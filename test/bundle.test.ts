import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInThisContext } from 'node:vm'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'client.js'), 'utf8')

interface LoaderEntry {
  id: string
  factory: (require: (id: string) => unknown) => unknown
}

describe('built client bundle', () => {
  it('uses the module-loader format and the supported extension points', () => {
    expect(source).toContain('window.__ModuleLoader__.load')
    expect(source).toContain("id: '@local/dsh-markdown'")
    expect(source).toContain('sidebar.right.tab.document')
    expect(source).toContain('shell.overlay')
    expect(source).toContain('documentPreviews')
    expect(source).toContain('popover')
    expect(source).toContain('showPopover')
    expect(source).toContain('dsh-md-overlay')
    expect(source).not.toContain('conversation.chat.markdown.fence')
    expect(source).not.toContain('requestFullscreen')
    expect(source).not.toContain('@local/dsh-mermaid')
  })

  it('returns a plugin object with the expected services and no leaked globals', () => {
    let entry: LoaderEntry | undefined
    const previous = window.__ModuleLoader__
    window.__ModuleLoader__ = {
      load: (value) => {
        entry = value
      },
    }
    try {
      runInThisContext(source, { filename: 'client.js' })
      expect(entry?.id).toBe('@local/dsh-markdown')
      const plugin = entry?.factory((name) => {
        if (name === 'react') return React
        if (name === 'react/jsx-runtime') return jsxRuntime
        throw new Error(`unexpected require: ${name}`)
      }) as { inject: readonly string[]; apply: () => void; pipeline: { id: string } }
      expect(plugin.inject).toEqual(['slots', 'locale', 'theme', 'documentPreviews'])
      expect(typeof plugin.apply).toBe('function')
      expect(plugin.pipeline.id).toBe('@local/dsh-markdown/pipeline')
      const globals = globalThis as Record<string, unknown>
      expect(globals.mermaid).toBeUndefined()
      expect(globals.dayjs).toBeUndefined()
      expect(globals.injected).toBeUndefined()
    } finally {
      window.__ModuleLoader__ = previous
    }
  })
})

declare global {
  interface Window {
    __ModuleLoader__?: { load(value: LoaderEntry): void }
  }
}
