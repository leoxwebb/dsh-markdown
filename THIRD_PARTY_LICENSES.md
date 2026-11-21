# Third-party licenses

This package is private and is not published to a registry. Its browser bundle
includes the following direct dependencies and their transitive dependencies.
The versions below are those resolved by `pnpm-lock.yaml` for this revision.

| Package | Version | License |
| --- | --- | --- |
| `dompurify` | 3.2.6 | MPL-2.0 OR Apache-2.0 |
| `highlight.js` | 11.12.0 | BSD-3-Clause |
| `mermaid` | 11.17.2 | MIT |
| `react-markdown` | 10.1.0 | MIT |
| `rehype-highlight` | 7.0.2 | MIT |
| `rehype-slug` | 6.0.0 | MIT |
| `github-slugger` | 2.0.0 | ISC |
| `remark-gfm` | 4.0.1 | MIT |
| `yaml` | 2.9.1 | ISC |

`react` and `react-dom` are not bundled; they are supplied by DSH's browser
module table. Their license is MIT.

The bundle also contains transitive packages from the unified/remark/rehype
ecosystem, `lowlight`, `highlight.js` language definitions, Mermaid's D3 and
layout dependencies, and DOMPurify. Those packages are distributed under MIT,
ISC, BSD-2-Clause, BSD-3-Clause, or Apache-2.0 licenses. Their license texts are
available in `node_modules` and in the published packages.

## Development-only references

`modern-web-guidance` (Apache-2.0, Google Chrome team and contributors) is a
development-time reference installed into `.agents/skills/` by
`npx modern-web-guidance@latest install --agent universal -y`. It is ignored by
git and is not part of the browser bundle or the installed plugin.
