// Validação de URLs de imagem fornecidas pelo usuário (mapa, handouts, retratos).
//
// Essas URLs NÃO são buscadas pelo servidor — são apenas armazenadas e
// renderizadas no cliente via <img>. Portanto qualquer host PÚBLICO de imagem
// é aceito (i.redd.it, imgur, discord, etc.). Como defesa em profundidade
// (caso alguma dessas URLs venha a ser buscada server-side no futuro),
// bloqueamos hosts internos/privados, evitando SSRF para serviços da rede.

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '') // remove colchetes de IPv6
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h === '::1' || h === '::' || h === '0.0.0.0') return true

  // IPv4 privado / reservado / loopback / link-local
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 0 || a === 127 || a === 10) return true
    if (a === 169 && b === 254) return true          // link-local (ex.: metadata cloud)
    if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12
    if (a === 192 && b === 168) return true           // 192.168.0.0/16
  }
  return false
}

/**
 * Valida e retorna uma URL de imagem segura.
 * Aceita qualquer host público via http(s); rejeita protocolos não-web e
 * hosts internos/privados (prevenção de SSRF). Retorna null se inválida.
 */
export function validateImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (isPrivateHost(parsed.hostname)) return null
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
      error: `${fieldName} inválida. Use uma URL http(s):// pública de imagem.`,
    }
  }
  return { value: result }
}
