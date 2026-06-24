import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE     = 50

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { id: true },
  }).catch(() => null)

  // Paginação para evitar queries ilimitadas
  const url      = new URL(req.url)
  const page     = Math.max(0, parseInt(url.searchParams.get('page') ?? '0'))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(url.searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))),
  )

  const campaigns = await prisma.campaign.findMany({
    where: { isOpen: true },
    include: {
      system:       true,
      _count:       { select: { members: true } },
      members:      { where: { role: 'GM' }, include: { user: { select: { username: true } } }, take: 1 },
      applications: user ? { where: { userId: user.id }, select: { status: true } } : false,
    },
    orderBy: { createdAt: 'desc' },
    take:    pageSize,
    skip:    page * pageSize,
  }).catch(() => [])

  return NextResponse.json({ campaigns, page, pageSize })
}
