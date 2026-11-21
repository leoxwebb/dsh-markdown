/** Resolve authored Markdown image destinations against the previewed file. */

const REMOTE_SCHEME = /^[a-z][a-z\d+.-]*:/iu
const WINDOWS_DRIVE = /^[a-z]:[/\\]/iu
const UNC_PATH = /^[/\\]{2}/u

/**
 * Whether a path contains control characters that a file URL must reject.
 * @param value - native path.
 * @returns true for C0 controls or DEL.
 */
function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/**
 * Whether a path is an absolute workspace path rather than a URL.
 * @param path - decoded path.
 * @returns true for POSIX or Windows-drive absolute paths.
 */
export function isAbsoluteWorkspacePath(path: string): boolean {
  return path.startsWith('/') || WINDOWS_DRIVE.test(path)
}

/**
 * Address an absolute file through DSH's authenticated file route.
 * @param base - application base URI (HTTP(S) or the Desktop dsh-app origin).
 * @param path - absolute native path.
 * @returns the file URL, or undefined for unsupported transports.
 */
export function fileMediaUrl(base: string, path: string): string | undefined {
  const supported = /^https?:/u.test(base) || base.startsWith('dsh-app://app/')
  if (!supported || !isAbsoluteWorkspacePath(path) || UNC_PATH.test(path)) return undefined
  if (hasControlCharacters(path)) return undefined
  return new URL(`api/file?path=${encodeURIComponent(path)}`, base).href
}

/**
 * Build a display URL for an authored image destination.
 * @param base - document base URI.
 * @param documentPath - absolute source path reported by the Host, when known.
 * @param destination - authored Markdown destination.
 * @returns a directly usable URL, the authenticated file URL, or undefined.
 */
export function markdownImageUrl(
  base: string,
  documentPath: string | undefined,
  destination: string,
): string | undefined {
  const trimmed = destination.trim()
  if (trimmed === '') return undefined
  if (/^(?:data|blob):/iu.test(trimmed)) return trimmed
  if (/^https?:/iu.test(trimmed)) return trimmed
  // Query and fragment are not filename components; the file route expects the bare path.
  const suffix = trimmed.search(/[?#]/u)
  const authoredPath = suffix === -1 ? trimmed : trimmed.slice(0, suffix)
  let path: string
  try {
    path = decodeURIComponent(authoredPath)
  } catch {
    return undefined
  }
  if (REMOTE_SCHEME.test(path) && !WINDOWS_DRIVE.test(path)) return undefined
  if (!isAbsoluteWorkspacePath(path)) {
    if (documentPath === undefined) return undefined
    const normalized = documentPath.replace(/\\/gu, '/')
    path = `${normalized.slice(0, normalized.lastIndexOf('/') + 1)}${path}`
  }
  return fileMediaUrl(base, path)
}
