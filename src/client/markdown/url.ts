/**
 * URL policy for authored Markdown.
 *
 * The default react-markdown transform already rejects `javascript:`, but it
 * also strips the Desktop `dsh-app:` origin used by the authenticated file
 * route. This transform keeps that origin and raster/data images while still
 * refusing executable schemes.
 */

const ALLOWED_PROTOCOLS = /^(?:https?|mailto|tel|dsh-app):/iu
const DATA_IMAGE = /^data:image\/(?:avif|gif|jpeg|png|webp);/iu
const SCHEME = /^[a-z][a-z\d+.-]*:/iu

/**
 * Decide whether a URL is safe to place in `href` or `src`.
 * @param url - authored destination after HTML entity decoding.
 * @returns the URL when allowed, otherwise an empty string.
 */
export function safeUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '') return ''
  if (ALLOWED_PROTOCOLS.test(trimmed) || DATA_IMAGE.test(trimmed)) return trimmed
  if (SCHEME.test(trimmed)) return ''
  // Relative destinations (including root-relative and fragment-only) stay relative.
  return trimmed
}

/** Compose a pipeline's URL transforms in declaration order. */
export function composeUrlTransforms(transforms: readonly ((url: string) => string)[]): (url: string) => string {
  return (url) => {
    let value = url
    for (const transform of transforms) {
      value = transform(value)
      if (value === '') return ''
    }
    return value
  }
}
