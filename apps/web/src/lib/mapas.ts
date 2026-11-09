import { prisma, type Mapa } from 'database'

/** Escalas de SAGA Mapas: [rótulo, tamanho da casa, unidade]. */
export const ESCALAS: [string, number, string][] = [['1,5 m', 1.5, 'm'], ['3 m', 3, 'm'], ['1,5 km', 1.5, 'km']]
export const LIM = { colMin: 10, colMax: 100, linMin: 10, linMax: 80 }
export const CASA = 40

export type MapaPublico = { id: string; nome: string; colunas: number; linhas: number; escala: number; arte: number; imagemUrl: string | null }
export const publico = (m: Mapa): MapaPublico => ({ id: m.id, nome: m.nome, colunas: m.colunas, linhas: m.linhas, escala: m.escala, arte: m.arte, imagemUrl: m.imagemUrl })

/**
 * Mapas da campanha, na ordem. Campanha sem mapa ganha o "Mapa 1" com a
 * imagem e os tokens da sessão mais recente (as mesas antigas não ficam sem mapa).
 */
export async function mapasDa(campaignId: string): Promise<{ mapas: Mapa[]; naMesa: string }> {
  let mapas = await prisma.mapa.findMany({ where: { campaignId }, orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }] })
  if (!mapas.length) {
    const s = await prisma.session.findFirst({ where: { campaignId }, orderBy: { startedAt: 'desc' }, select: { mapImageUrl: true, tokensJson: true } })
    const m = await prisma.mapa.create({ data: { campaignId, nome: 'Mapa 1', imagemUrl: s?.mapImageUrl ?? null, tokensJson: s?.tokensJson ?? null } })
    await prisma.campaign.update({ where: { id: campaignId }, data: { mapaNaMesaId: m.id } })
    mapas = [m]
  }
  const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { mapaNaMesaId: true } })
  const naMesa = mapas.some(m => m.id === c?.mapaNaMesaId) ? c!.mapaNaMesaId! : mapas[0]!.id
  return { mapas, naMesa }
}

/** Tokens (centro em px) presos dentro do tabuleiro de colunas × linhas casas. */
export function prenderTokens(tokensJson: string | null, colunas: number, linhas: number): string | null {
  if (!tokensJson) return tokensJson
  try {
    const ts = JSON.parse(tokensJson) as { x: number; y: number }[]
    if (!Array.isArray(ts)) return tokensJson
    const mx = colunas * CASA - CASA / 2, my = linhas * CASA - CASA / 2
    return JSON.stringify(ts.map(t => ({ ...t, x: Math.min(mx, Math.max(CASA / 2, t.x)), y: Math.min(my, Math.max(CASA / 2, t.y)) })))
  } catch { return tokensJson }
}

/** Névoa que o jogador recebe: só as áreas cobertas, sem o nome que o mestre deu (pode entregar o segredo). */
export function nevoaPublica(raw: string | null): string | null {
  if (!raw) return null
  try {
    const xs = JSON.parse(raw) as { id?: string; x?: number; y?: number; w?: number; h?: number; on?: boolean }[]
    if (!Array.isArray(xs)) return null
    return JSON.stringify(xs.filter(f => f.on).map((f, i) => ({ id: f.id ?? `n${i}`, label: '', x: f.x, y: f.y, w: f.w, h: f.h, on: true })))
  } catch { return null }
}
