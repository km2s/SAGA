import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { mapasDa, publico } from '@/lib/mapas'

/**
 * "Mostrar aos jogadores" (só o mestre). A sessão é o espelho do mapa na mesa:
 * os tokens e a imagem da sessão voltam para o mapa que sai, e os do mapa que
 * entra vão para a sessão (todos veem pela sondagem da Mesa).
 */
export async function POST(_req: Request, { params }: { params: { id: string; mapaId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gm = await prisma.campaignMember.findFirst({ where: { campaignId: params.id, role: 'GM', user: { discordId: session.user.discordId } }, select: { id: true } }).catch(() => null)
  if (!gm) return NextResponse.json({ error: 'Só o Mestre troca o mapa da mesa' }, { status: 403 })

  const { mapas, naMesa } = await mapasDa(params.id)
  const entra = mapas.find(m => m.id === params.mapaId)
  if (!entra) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (naMesa === entra.id) return NextResponse.json({ naMesa, mapa: publico(entra) })

  const s = await prisma.session.findFirst({ where: { campaignId: params.id }, orderBy: { startedAt: 'desc' }, select: { id: true, tokensJson: true, mapImageUrl: true } })
  await prisma.$transaction([
    ...(s ? [
      prisma.mapa.update({ where: { id: naMesa }, data: { tokensJson: s.tokensJson, imagemUrl: s.mapImageUrl } }),
      prisma.session.update({ where: { id: s.id }, data: { tokensJson: entra.tokensJson, mapImageUrl: entra.imagemUrl } }),
    ] : []),
    prisma.campaign.update({ where: { id: params.id }, data: { mapaNaMesaId: entra.id } }),
  ])
  return NextResponse.json({ naMesa: entra.id, mapa: publico(entra) })
}
