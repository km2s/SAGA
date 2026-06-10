import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

const ONLINE_THRESHOLD_MS = 45_000

// POST — heartbeat: marca o membro como visto agora
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updated = await prisma.campaignMember.updateMany({
    where: {
      campaignId: params.id,
      user: { discordId: session.user.discordId },
    },
    data: { lastSeenAt: new Date() },
  }).catch(() => null)

  if (!updated || updated.count === 0) {
    return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}

// GET — retorna IDs dos membros online (lastSeenAt nos últimos 45s)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isMember = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId } },
    select: { id: true },
  }).catch(() => null)
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const since = new Date(Date.now() - ONLINE_THRESHOLD_MS)
  const onlineMembers = await prisma.campaignMember.findMany({
    where: { campaignId: params.id, lastSeenAt: { gte: since } },
    select: { id: true },
  }).catch(() => [])

  return NextResponse.json({ onlineIds: onlineMembers.map(m => m.id) })
}
