const ALLOWED_PROTOCOLS = new Set(['https:', 'http:'])

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return ALLOWED_PROTOCOLS.has(protocol) ? url : null
  } catch {
    return null
  }
}
