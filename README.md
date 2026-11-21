# Enhanced Markdown for DSH

An extensible Markdown document-preview renderer for DeepSeek Harness. It is not
a Mermaid-only patch: the whole `.md` / `.markdown` renderer is composed from a
typed extension pipeline, and Mermaid is one fence renderer in that pipeline.

The plugin uses DSH's supported extension points only:

- `ctx.documentPreviews.register(...)` for the `.md` implementation;
- the keyed `sidebar.right.tab.document` slot for its body;
- the `shell.overlay` slot for the top-layer diagram canvas;
- `ctx.locale`, `ctx.theme`, and `ctx.effect` for plugin-owned resources.

It registers no Chat slot, does not observe or rewrite Chat/document DOM, and
does not request system fullscreen.

## Features

| Area | Behavior |
| --- | --- |
| Markdown | `react-markdown` + `remark-gfm`: headings with ids, lists, task lists, tables, strikethrough, autolinks |
| Code | `rehype-highlight` + highlight.js common languages, language banner, copy, wrap, scrollable region |
| Frontmatter | YAML metadata as a native, **collapsed** `<details>` key/value list as soon as its closing delimiter arrives; invalid blocks stay verbatim |
| Mermaid | `mermaid`, `mmd`, and `mermaid-js` fences render as cards with source, copy, and **Open canvas** |
| Canvas | Native `dialog popover="manual"` in the top layer, covering the centre column and right sidebar while leaving the left sidebar usable; covered columns become `inert` and the shell bottom row stays outside the canvas |
| Images | Relative paths resolve through DSH's authenticated `/api/file` route; HTTP(S) and raster data images stay authored |
| Links | External links open with `noopener noreferrer`; `javascript:` and other executable schemes are refused |
| Theme | DSH aliases and static palette tokens; light/dark syntax colors; no hard-coded page theme |
| Safety | Raw HTML is not rendered; Mermaid directives are stripped and SVG is sanitized with DOMPurify |

This renderer registers in the `extension` band, so it is the default for new
`.md` / `.markdown` tabs. The built-in Markdown renderer stays registered and
remains selectable: choose **Markdown** in the file viewer's renderer dropdown
to return to it, or **Enhanced Markdown** to switch back.

## Install

From the DSH **Plugins** page choose **Add plugin** and select this directory, or
install the bundle through the plugin manager with the absolute directory path.
After installation, confirm the **Enhanced Markdown** row and open any `.md` file
in the right sidebar.

## Extension model

Every capability is a `MarkdownExtension`:

```ts
export interface MarkdownExtension {
  id: string
  remarkPlugins?: PluggableList
  rehypePlugins?: PluggableList
  components?: Components
  fences?: readonly FenceRenderer[]
  frontmatter?: FrontmatterRenderer
  overlays?: readonly OverlayRenderer[]
  urlTransform?: (url: string) => string
}
```

- **Fence renderer** — claims one or more language aliases, optionally declares the
  overlay kind it opens, and renders the fence inside the document (`mermaid` is one).
- **Frontmatter renderer** — the first registered renderer presents document
  metadata.
- **Overlay renderer** — claims a request kind and renders the top-layer canvas.
- **Components / remark / rehype plugins** — ordinary overrides and transforms.
  The block-code marker runs after every rehype plugin so code dispatch stays
  reliable.

`src/client/extensions/index.ts` is the composition root. To add a capability:

1. implement `MarkdownExtension` in `src/client/extensions/`;
2. append it to `defaultExtensions` (later components win, duplicate fence
   languages and overlay kinds are rejected);
3. add a rendering test and, for a fence, an overlay test.

The pipeline is created once in `src/client/entry.tsx` and is immutable for the
activation. The extension seam is package-level: DSH has no documented runtime
API for another plugin to import this bundle's exports, so a new extension is
added by composing the pipeline in this package rather than by monkey-patching
a global.

## Toolchain

- **Bundler:** Vite 7 (Rollup) with a small module-loader wrapper plugin.
- **Language:** TypeScript 5.9, `strict`, `noUncheckedIndexedAccess`.
- **Formatter + linter:** Biome 2.6 (`pnpm format`, `pnpm lint`).
- **Tests:** Vitest 3 + jsdom (`pnpm test`).
- **Build:** `pnpm build` writes `index.js` (Host) and `client.js` (browser).
- **Modern Web Guidance:** installed with
  `npx modern-web-guidance@latest install --agent universal -y`; the lockfile is
  `skills-lock.json`, and the skill is a development-only reference in
  `.agents/skills/` (ignored by git).

```sh
pnpm install
pnpm check   # typecheck + lint + build + test
```

## Modern web features used

- `dialog popover="manual"` + `showPopover()` for a non-modal top-layer panel;
- `@starting-style` and `transition-behavior: allow-discrete` for entry motion,
  with `prefers-reduced-motion` handling;
- CSS cascade layers, native nesting, `:is()`, `:where()`, `color-mix()`;
- container queries for code-card and table toolbars;
- logical properties, `text-wrap: balance` / `pretty`;
- `scrollbar-color` / `scrollbar-width` with a WebKit fallback;
- `AbortSignal` for canvas listener cleanup;
- native `<dialog>`, `<details>`, `<section>` landmarks, and `:focus-visible`.

## Compatibility

- Target: DSH `0.2.2-rc.5` (Desktop and Web).
- Popover is Baseline; if `showPopover()` is unavailable the dialog keeps a
  fixed, high-z-index fallback but is no longer in the top layer.
- Mermaid recognition is explicit-language only. A fence without a language, or
  a fence labelled `text`, stays code even when its content looks like Mermaid.
- No source-line navigation or line numbers yet; `sourceLines` is `false` for
  this renderer. Source-line navigation and a line-number gutter are planned as
  separate extensions rather than added to the core Markdown component.
- Mermaid's leading YAML frontmatter (including `title` and per-diagram config) is
  stripped before rendering so a document cannot weaken the plugin's security
  configuration. Use the fence language and card controls instead of Mermaid
  frontmatter for presentation.
- The canvas covers the centre column and right sidebar, so DSH menus or toasts
  that are not in the top layer can sit underneath it. This is the tradeoff of a
  top-layer canvas; the left sidebar and the shell bottom row stay usable.
- The canvas geometry is derived from the AppFrame's published layout anchors
  (`[data-rightbar-col]`, the adjacent columns, and `[data-shell-overlay]`).
  If a future DSH version changes those anchors, the overlay falls back to a
  visibly labelled full-window canvas.
- The bundle is large because Mermaid and highlight.js are bundled into the
  single module-loader artifact (about 3.8 MiB minified). Lazy chunks would need
  a DSH module-loader seam for secondary URLs.

## Verification

`pnpm check` covers the extension graph, Markdown rendering, heading ids,
highlighting, Mermaid detection, frontmatter, image/link policy, overlay
geometry, inert/focus wiring, the built module-loader bundle, stylesheet
regressions, and Mermaid sanitization.

Visual rendering, top-layer behavior in the actual DSH window, and the
open/canvas flow still need a human check after a page refresh; see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the limits of the automated
checks.
