# Architecture

## Goal

Build a Markdown **document preview** that is more than a Mermaid patch: a
renderer assembled from independent capabilities, with Mermaid as one of them.
The design must stay inside DSH's plugin architecture and must not read or
rewrite another plugin's DOM.

## Layers

```text
DSH document owner
  └─ sidebar.right.tab.document (keyed by renderer id)
       └─ MarkdownDocument
            ├─ MarkdownProvider (pipeline + stores + locale + document flags)
            ├─ frontmatter renderer (first registered extension, collapsed `<details>`)
            └─ react-markdown
                 ├─ remark plugins  (gfm)
                 ├─ rehype plugins  (highlight, then core block marker)
                 ├─ component map   (base + extension overrides)
                 └─ code component
                      ├─ FenceRegistry.resolve(language) → fence renderer
                      └─ CodeBlock (highlighted children, copy, wrap)
```

The canvas is independent of the document tree:

```text
shell.overlay
  └─ MarkdownOverlay (dialog popover="manual")
       ├─ geometry: AppFrame columns, viewport coordinates
       └─ OverlayRegistry.get(request.kind).Component
            └─ MermaidCanvas → SvgCanvas → infinite-canvas
```

## DSH integration

| Concern | Extension point |
| --- | --- |
| `.md` / `.markdown` implementation | `ctx.documentPreviews.register({ id, extensions, priority: 'extension', loading: 'text-pages', wrap: true })` |
| Document body | keyed `sidebar.right.tab.document` registration under the same id |
| Canvas | list registration in `shell.overlay` |
| Copy, theme, styles | `ctx.locale`, `ctx.theme`, `ctx.effect` |

The implementation id is `@local/dsh-markdown/markdown`. The extension band
places **Enhanced Markdown** ahead of the product implementation, so new
`.md` / `.markdown` tabs open with this renderer. The built-in
`@deepseek-ai/dsh-client-ui-sidebar-documentpreview/markdown` registration stays
in the registry and remains selectable from the viewer dropdown.

No code:

- registers `conversation.chat.markdown.fence`;
- imports `@deepseek-ai/dsh-client-ui-primitives` at runtime;
- uses a `MutationObserver`, DOM replacement, iframe, popup window, or
  `requestFullscreen`;
- appends an application root to `document.body`.

## Extension contract

`src/client/markdown/extension.ts` owns the public shape:

| Member | Purpose |
| --- | --- |
| `fences` | `FenceRenderer` with aliases and a React `Component` |
| `frontmatter` | `FrontmatterRenderer` for the leading YAML block |
| `overlays` | `OverlayRenderer` keyed by an overlay request kind |
| `remarkPlugins` / `rehypePlugins` | unified transforms |
| `components` | react-markdown component overrides; later extensions win |
| `urlTransform` | additional URL policy after the core safe-URL transform |

`createMarkdownPipeline` validates the graph:

- duplicate extension ids throw;
- two fence renderers cannot claim one language;
- two overlay renderers cannot claim one kind;
- a Mermaid fence without a Mermaid overlay throws;
- the core block marker is appended after every extension rehype plugin.

The pipeline is created once at module scope and is read-only for the
activation. Components read it through `MarkdownProvider`, so there is no
per-render plugin mutation or global state.

### Adding a capability

1. Implement `MarkdownExtension` under `src/client/extensions/`.
2. Append it to `defaultExtensions`.
3. Add a render test. For a fence, also add an overlay renderer and a canvas
   test.

The seam is package-level, not cross-bundle: DSH does not document a runtime API
for one client plugin to import another bundle's exports, and a global registry
would be an undeclared contract. A future DSH fence slot could replace this
composition root without changing the fence/overlay components.

## Code dispatch

`rehypeHighlight` rewrites fenced code into highlighted spans. A removed
react-markdown `inline` prop is not used. The core rehype pass marks every
`pre > code` node with `dataCodeBlock`, so the `code` override distinguishes
blocks from inline code regardless of language, newline count, or extra rehype
plugins. This fixed a real bug found while testing: without the marker, a
language fence with no trailing newline was treated as inline code.

Fence recognition is explicit-language only:

- `mermaid`, `mmd`, `mermaid-js` → Mermaid;
- no language, `text`, and unknown languages → code;
- content sniffing is intentionally absent, which keeps `text` fences stable.

## Overlay geometry

The overlay root lives inside `shell.overlay`. `SlotOutlet` inserts a
`display: contents` anchor, so the layer is found with
`closest('[data-shell-overlay]')` and the frame with its parent.

The canvas must cover the centre column and the right sidebar while leaving the
left sidebar usable. The centre column is
`[data-rightbar-col]?.previousElementSibling`; the frame rectangle supplies the
top/bottom and the right edge. Bounds are reported in **viewport** coordinates
because a top-layer popover is fixed to the viewport, not to the overlay layer.

The bounds are recomputed with a `ResizeObserver` on the frame, centre column,
and right sidebar, plus `window.resize`. The left bound follows the visible
sidebar column (or the leading controls when the sidebar is collapsed), so a
drawer is not covered. The bottom bound follows the content columns, keeping the
shell's bottom row outside the canvas. If the anchors fail, the canvas falls
back to a labelled full-window rectangle instead of becoming invisible.

## Top layer

`<dialog popover="manual">` opens with `showPopover()`:

- it is in the browser top layer, above the app content;
- the page stays interactive, so the left sidebar is not inert;
- clicking outside does not dismiss it, so sidebar work does not close the
  canvas;
- `Close` and `Esc` are explicit; `Esc` is handled by the dialog, so a key press
  in the left sidebar is not intercepted. The covered centre and right columns
  receive `inert` while the canvas is open; the left sidebar does not.

`showPopover()` is feature-detected. If it is missing, the dialog keeps a fixed
position with `z-index: 2147483000`; behavior degrades to a normal fixed panel.

Entry motion uses `@starting-style` and `transition-behavior: allow-discrete`;
`prefers-reduced-motion` shortens it. No system fullscreen, no popup window.

## Security

- **Raw HTML:** not rendered (`skipHtml`).
- **Prose whitespace:** the preview owner's shared scrollport uses
  `white-space: pre`; the document root resets it to `normal`, while code and
  source blocks keep `pre`.
- **URLs:** `safeUrl` allows HTTP(S), `mailto:`, `tel:`, `dsh-app:`, raster
  `data:image/*`, and relative destinations. Executable schemes are replaced
  with an empty URL.
- **Images:** relative paths resolve beside the Host-reported document path and
  go through `/api/file`; query/fragment suffixes are not treated as filename
  characters; UNC paths and control characters are rejected.
- **Mermaid:** `%%{...}%%` directives and leading YAML frontmatter config
  (including `themeCSS`, `htmlLabels`, and `securityLevel`) are stripped before
  parsing; the output SVG is sanitized with DOMPurify's SVG profile; Mermaid runs
  with `securityLevel: 'strict'` and `htmlLabels: false`. Mermaid frontmatter
  `title` is therefore not rendered; the card header supplies the label.
- **Extension isolation:** each fence and the frontmatter renderer run inside an
  error boundary, so one malformed block falls back to source instead of
  breaking the document.

## Theme and accessibility

- Colors and fonts come from DSH tokens, with static palette token fallbacks.
- Light/dark syntax colors are selected from the DSH static palette by
  `data-theme`; no fixed page theme.
- `text-wrap: balance` is limited to headings; `pretty` to paragraphs, list
  items, and quotes.
- Code blocks and tables are scrollable regions with accessible names and
  `tabindex="0"` (the guidance explicitly requires keyboard reachability for
  scrollable code blocks; Biome's non-interactive-tabindex rule is suppressed
  with that justification).
- Canvas controls have accessible names; focus rings use `:focus-visible`; the
  canvas viewport is focused once per open request and is operable with `+`, `-`,
  `0`, and the arrow keys for panning.
- `prefers-reduced-motion` and `forced-colors` have explicit handling.

## Build

`scripts/build.mts` uses Vite twice:

- Host: ESM, Node 22, empty `apply`.
- Client: CommonJS library with `react`, `react/jsx-runtime`, and `react-dom`
  external; a Rollup `generateBundle` plugin wraps the chunk in
  `window.__ModuleLoader__.load({ id, factory(require) { ... } })`.

The wrapper restores `globalThis.injected` so Mermaid's feature-flag bootstrap
cannot leak a page global. Generated `index.js` and `client.js` are committed
because DSH links local directories and does not build on installation.

## Verification and limits

`pnpm check` runs TypeScript, Biome, the build, and 10 Vitest files (68 tests) as
of this version. It covers:

- extension composition, duplicate detection, and overlay-kind validation;
- Markdown/GFM/table/task-list rendering and heading ids;
- syntax highlighting and block-vs-inline dispatch;
- Mermaid card rendering, explicit-language-only recognition;
- frontmatter parsing, streaming behavior, and fallback;
- image and link resolution, including image-load failure fallback;
- Mermaid directive/frontmatter/SVG sanitization;
- overlay geometry (sidebar/drawer, bottom row), inert/focus, fallback, and error
  states;
- stylesheet regressions (host whitespace reset, wrap/scroll selectors, top-layer
  animation);
- plugin wiring, cleanup, and the generated module-loader bundle.

Not covered automatically:

- the real DSH window's top-layer stacking and pointer behavior;
- theme appearance in the running app;
- the actual open/close interaction with live sidebar resizing.

Those require a page refresh and a human check of a `.md` file in the right
sidebar.
