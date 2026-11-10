import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { validateImageUrlOrError } from '@/lib/validate-url'
import { LIM, mapasDa, prenderTokens, publico } from '@/lib/mapas'
import { apagarSeNosso } from '@/lib/storage'

async function doMestre(campaignId: string, mapaId: string, discordId: string) {
  const gm = await prisma.campaignMember.findFirst({ where: { campaignId, role: 'GM', user: { discordId } }, select: { id: true } }).catch(() => null)
  if (!gm) return null
  return prisma.mapa.findFirst({ where: { id: mapaId, campaignId } }).catch(() => null)
}

/** Lê um mapa com tokens e névoa (o mestre abre um mapa para preparar sem os jogadores verem). */
export async function GET(_req: Request, { params }: { params: { id: string; mapaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mapa = await doMestre(params.id, params.mapaId, session.user.discordId)
  if (!mapa) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ ...publico(mapa), tokensJson: mapa.tokensJson, nevoaJson: mapa.nevoaJson })
}

/**
 * Edita o mapa (só o mestre): nome, tamanho, escala, imagem, tokens e névoa.
 * Ao diminuir, os tokens fora do tabuleiro vão para a borda (no mapa e, se
 * ele está na mesa, na sessão).
 */
export async function PATCH(req: Request, { params }: { params: { id: string; mapaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mapa = await doMestre(params.id, params.mapaId, session.user.discordId)
  if (!mapa) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const b = await req.json().catch(() => ({})) as { nome?: string; colunas?: number; linhas?: number; escala?: number; imagemUrl?: string | null; tokensJson?: string | null; nevoaJson?: string | null }
  const n = (x: unknown, lo: number, hi: number) => typeof x === 'number' && isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : undefined
  const data: Record<string, unknown> = {}
  if (typeof b.nome === 'string') data.nome = b.nome.trim().slice(0, 80) || 'Mapa sem nome'
  const colunas = n(b.colunas, LIM.colMin, LIM.colMax), linhas = n(b.linhas, LIM.linMin, LIM.linMax), escala = n(b.escala, 0, 2)
  if (colunas !== undefined) data.colunas = colunas
  if (linhas !== undefined) data.linhas = linhas
  if (escala !== undefined) data.escala = escala
  if ('imagemUrl' in b) {
    if (!b.imagemUrl) data.imagemUrl = null
    else { const { value, error } = validateImageUrlOrError(b.imagemUrl, 'imagemUrl'); if (error) return NextResponse.json({ error }, { status: 400 }); data.imagemUrl = value }
  }
  for (const k of ['tokensJson', 'nevoaJson'] as const) {
    if (k in b) {
      const v = b[k]
      if (v !== null && (typeof v !== 'string' || Buffer.byteLength(v, 'utf8') > 200_000)) return NextResponse.json({ error: `${k} inválido` }, { status: 400 })
      if (v) { try { if (!Array.isArray(JSON.parse(v))) throw new Error() } catch { return NextResponse.json({ error: `${k} inválido` }, { status: 400 }) } }
      data[k] = v
    }
  }
  const cols = colunas ?? mapa.colunas, lins = linhas ?? mapa.linhas
  if (colunas !== undefined || linhas !== undefined) data.tokensJson = prenderTokens((data.tokensJson as string | null | undefined) ?? mapa.tokensJson, cols, lins)
  const atualizado = await prisma.mapa.update({ where: { id: mapa.id }, data })
  // Imagem trocada: a antiga sai do bucket (se for nossa).
  if ('imagemUrl' in data && mapa.imagemUrl && mapa.imagemUrl !== data.imagemUrl) void apagarSeNosso(mapa.imagemUrl)

  // Mapa na mesa: a sessão é o espelho dele (imagem e tokens presos ao tamanho novo).
  const { naMesa } = await mapasDa(params.id)
  if (naMesa === mapa.id && ('imagemUrl' in data || colunas !== undefined || linhas !== undefined)) {
    const s = await prisma.session.findFirst({ where: { campaignId: params.id }, orderBy: { startedAt: 'desc' }, select: { id: true, tokensJson: true } })
    if (s) await prisma.session.update({ where: { id: s.id }, data: { ...('imagemUrl' in data ? { mapImageUrl: data.imagemUrl as string | null } : {}), tokensJson: prenderTokens(s.tokensJson, cols, lins) } })
  }
  return NextResponse.json(publico(atualizado))
}

/** Exclui (só o mestre). Não vale para o mapa na mesa nem para o último. */
export async function DELETE(_req: Request, { params }: { params: { id: string; mapaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mapa = await doMestre(params.id, params.mapaId, session.user.discordId)
  if (!mapa) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const { mapas, naMesa } = await mapasDa(params.id)
  if (mapas.length <= 1) return NextResponse.json({ error: 'Precisa existir pelo menos um mapa' }, { status: 409 })
  if (naMesa === mapa.id) return NextResponse.json({ error: 'Os jogadores estão vendo este mapa' }, { status: 409 })
  await prisma.mapa.delete({ where: { id: mapa.id } })
  void apagarSeNosso(mapa.imagemUrl)
  return NextResponse.json({ ok: true })
}
