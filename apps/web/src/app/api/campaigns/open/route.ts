import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { id: true },
  }).catch(() => null)

  const campaigns = await prisma.campaign.findMany({
    where: { isOpen: true },
    include: {
      system: true,
      _count: { select: { members: true } },
      members: { where: { role: 'GM' }, include: { user: { select: { username: true } } }, take: 1 },
      applications: user ? { where: { userId: user.id }, select: { status: true } } : false,
    },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [])

  return NextResponse.json(campaigns)
}
