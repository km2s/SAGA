import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaigns = await prisma.campaign.findMany({
    where: { members: { some: { user: { discordId: session.user.discordId } } } },
    include: {
      system: true,
      _count: { select: { members: true } },
      sessions: { where: { isActive: true }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(campaigns)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, theme, systemName } = body

  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let system = systemName
    ? await prisma.rPGSystem.findFirst({ where: { name: systemName } })
    : null

  if (systemName && !system) {
    system = await prisma.rPGSystem.create({ data: { name: systemName } })
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      description,
      theme,
      systemId: system?.id ?? null,
      members: { create: { userId: user.id, role: 'GM' } },
    },
    include: { system: true },
  })

  return NextResponse.json(campaign, { status: 201 })
}
