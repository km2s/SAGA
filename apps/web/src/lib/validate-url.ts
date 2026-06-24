// Hosts permitidos para imagens externas na aplicação.
// Expandir conforme necessário ao adicionar novas integrações.
const ALLOWED_IMAGE_HOSTS = new Set([
  'cdn.discordapp.com',
  'media.discordapp.net',
  'res.cloudinary.com',
  'i.imgur.com',
])

/**
 * Valida e retorna uma URL de imagem segura.
 * Rejeita hosts não autorizados (prevenção de SSRF).
 * Retorna null se a URL for inválida, vazia ou de host não permitido.
 */
export function validateImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return null
    return trimmed
  } catch {
    return null
  }
}

/**
 * Mesma validação mas retorna erro estruturado para uso em API routes.
 */
export function validateImageUrlOrError(
  url: unknown,
  fieldName = 'imageUrl',
): { value: string | null; error?: string } {
  if (url === undefined || url === null) return { value: null }
  if (typeof url !== 'string' || !url.trim()) return { value: null }
  const result = validateImageUrl(url)
  if (result === null) {
    return {
      value: null,
      error: `${fieldName} inválida. Hosts permitidos: cdn.discordapp.com, res.cloudinary.com, i.imgur.com`,
    }
  }
  return { value: result }
}
