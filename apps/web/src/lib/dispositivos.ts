/** "Chrome · Windows", "Safari · iPhone"… a partir do User-Agent (Segurança › Dispositivos). */
export function nomeDispositivo(ua: string): string {
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Discord/i.test(ua) ? 'App do Discord' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'outro sistema'
  return `${nav} · ${so}`
}

/** Cidade e país pelos cabeçalhos da Vercel (sem eles, fica sem local). */
export function localDe(h: { get(n: string): string | null }): string | null {
  const cidade = h.get('x-vercel-ip-city'), pais = h.get('x-vercel-ip-country')
  const nomes: Record<string, string> = { BR: 'Brasil', PT: 'Portugal', US: 'Estados Unidos', AR: 'Argentina' }
  const c = cidade ? decodeURIComponent(cidade) : null
  return [c, pais ? nomes[pais] ?? pais : null].filter(Boolean).join(', ') || null
}

export const iconeDispositivo = (nome: string) => (/iPhone|Android/.test(nome) ? 'smartphone' : /iPad/.test(nome) ? 'tablet' : 'monitor')
