import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

/** PATCH { abrir: true }: quem recebeu o sussurro rompe o selo (o mestre vê "selo rompido"). */
export async function PATCH(req: Request, { params }: { params: { msgId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { discordId: session.user.discordId }, select: { id: true } }).catch(() => null)
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { abrir?: boolean }
  if (!b.abrir) return NextResponse.json({ error: 'Nada para fazer' }, { status: 400 })
  const r = await prisma.mensagem.updateMany({ where: { id: params.msgId, paraId: u.id, campaignId: { not: null }, abertoEm: null }, data: { abertoEm: new Date() } })
  return NextResponse.json({ ok: true, aberto: r.count > 0 })
}
