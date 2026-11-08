import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { withNoCache } from '@/lib/no-cache'
import { LIM, mapasDa, publico } from '@/lib/mapas'

async function membro(campaignId: string, discordId: string) {
  return prisma.campaignMember.findFirst({ where: { campaignId, user: { discordId } }, select: { id: true, role: true } }).catch(() => null)
}

/** Lista os mapas (SAGA Mapas). Jogador recebe só o que está na mesa. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const m = await membro(params.id, session.user.discordId)
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { mapas, naMesa } = await mapasDa(params.id)
  const lista = m.role === 'GM' ? mapas : mapas.filter(x => x.id === naMesa)
  return withNoCache(NextResponse.json({ mapas: lista.map(publico), naMesa }))
}

/** Novo mapa (só o mestre). Padrão: Médio, 30 × 20. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const m = await membro(params.id, session.user.discordId)
  if (m?.role !== 'GM') return NextResponse.json({ error: 'Só o Mestre cria mapas' }, { status: 403 })
  const body = await req.json().catch(() => ({})) as { nome?: string; colunas?: number; linhas?: number; escala?: number }
  const { mapas } = await mapasDa(params.id)
  if (mapas.length >= 50) return NextResponse.json({ error: 'Limite de 50 mapas por campanha' }, { status: 400 })
  const n = (x: unknown, lo: number, hi: number, padrao: number) => typeof x === 'number' && isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : padrao
  const novo = await prisma.mapa.create({
    data: {
      campaignId: params.id, nome: (body.nome ?? '').trim().slice(0, 80) || `Mapa ${mapas.length + 1}`,
      colunas: n(body.colunas, LIM.colMin, LIM.colMax, 30), linhas: n(body.linhas, LIM.linMin, LIM.linMax, 20),
      escala: n(body.escala, 0, 2, 0), arte: mapas.length % 5, ordem: mapas.length,
    },
  })
  return NextResponse.json(publico(novo), { status: 201 })
}
