/**
 * Build the Host half and the browser module-loader bundle with Vite.
 *
 * The client build is a CommonJS library; a tiny Rollup plugin wraps it in the
 * `window.__ModuleLoader__.load` factory that DSH's browser module table expects.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temp = join(root, '.build')

/** Wrap the emitted CommonJS chunk in the DSH module-loader factory. */
function moduleLoaderPlugin(): Plugin {
  return {
    name: 'dsh-markdown-module-loader',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.isEntry) continue
        output.code = `window.__ModuleLoader__.load({
  id: '@local/dsh-markdown',
  factory(require) {
    const hadInjected = Object.prototype.hasOwnProperty.call(globalThis, 'injected')
    const priorInjected = globalThis.injected
    const module = { exports: {} }
    const exports = module.exports
    try {
      ;(function (module, exports, require) {
${output.code}
      })(module, exports, require)
      return module.exports
    } finally {
      if (hadInjected) globalThis.injected = priorInjected
      else delete globalThis.injected
    }
  },
})
`
      }
    },
  }
}

/** Build the empty Host module as ESM for Node. */
async function buildHost(): Promise<void> {
  await build({
    configFile: false,
    root,
    publicDir: false,
    logLevel: 'warn',
    build: {
      outDir: join(temp, 'host'),
      emptyOutDir: true,
      target: 'node22',
      ssr: true,
      minify: false,
      lib: {
        entry: join(root, 'src', 'host', 'index.ts'),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: [/^node:/u],
      },
    },
  })
  const host = await readFile(join(temp, 'host', 'index.js'), 'utf8')
  await writeFile(join(root, 'index.js'), host)
}

/** Build the browser bundle with React supplied by the module table. */
async function buildClient(): Promise<void> {
  await build({
    configFile: false,
    root,
    publicDir: false,
    logLevel: 'warn',
    esbuild: {
      jsx: 'automatic',
    },
    build: {
      outDir: join(temp, 'client'),
      emptyOutDir: true,
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: false,
      lib: {
        entry: join(root, 'src', 'client', 'entry.tsx'),
        formats: ['cjs'],
        fileName: () => 'client.cjs',
      },
      rollupOptions: {
        external: ['react', 'react/jsx-runtime', 'react-dom'],
        output: {
          exports: 'named',
          inlineDynamicImports: true,
        },
        plugins: [moduleLoaderPlugin()],
      },
    },
  })
  const client = await readFile(join(temp, 'client', 'client.cjs'), 'utf8')
  await writeFile(join(root, 'client.js'), client)
}

await mkdir(temp, { recursive: true })
await buildHost()
await buildClient()
await rm(temp, { recursive: true, force: true })

const clientBytes = (await readFile(join(root, 'client.js'))).byteLength
console.log(`index.js and client.js written (${(clientBytes / 1024 / 1024).toFixed(2)} MiB)`)
