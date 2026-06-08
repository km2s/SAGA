import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: {
      campaignId: params.id,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'Forbidden — GM only' }, { status: 403 })

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null)
  if (!activeSession) return NextResponse.json({ error: 'Nenhuma sessão ativa' }, { status: 400 })

  const ended = await prisma.session.update({
    where: { id: activeSession.id },
    data: { isActive: false, endedAt: new Date() },
  })

  return NextResponse.json(ended)
}
