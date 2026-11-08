import { NextResponse } from 'next/server'
import { prisma } from 'database'
import { membroAtual } from '@/lib/mestre'

/** "Arquivar campanha": sai da lista principal e da Taverna. `DELETE` desarquiva. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const ativa = await prisma.session.findFirst({ where: { campaignId: params.id, isActive: true }, select: { id: true } }).catch(() => null)
  if (ativa) return NextResponse.json({ error: 'Encerre a sessão ao vivo antes de arquivar' }, { status: 409 })
  await prisma.campaign.update({ where: { id: params.id }, data: { archivedAt: new Date(), isOpen: false } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, member } = await membroAtual(params.id, true)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.campaign.update({ where: { id: params.id }, data: { archivedAt: null } })
  return NextResponse.json({ ok: true })
}
