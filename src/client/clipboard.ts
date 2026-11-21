/** Clipboard access that degrades to a visible failure instead of throwing. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return false
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
