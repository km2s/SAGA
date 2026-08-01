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
  const { name, description, theme, systemName, campaignType, isOpen, maxSlots, contentTone, playStyle, sessionFrequency, minExperience, addToSystems, systemCategory, systemDescription, customSystemName } = body

  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { discordId: session.user.discordId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // When "Personalizado" is selected and the GM gave a custom name, use that name; otherwise use "Personalizado"
  const resolvedSystemName: string | null = systemName
    ? (systemName === 'Personalizado' && typeof customSystemName === 'string' && customSystemName.trim()
        ? customSystemName.trim().slice(0, 100)
        : systemName)
    : null

  let system = resolvedSystemName
    ? await prisma.rPGSystem.findFirst({ where: { name: resolvedSystemName, isPreset: true } })
    : null

  if (resolvedSystemName && !system) {
    const shouldRegister = addToSystems === true
    system = await prisma.rPGSystem.create({
      data: {
        name: resolvedSystemName,
        description: shouldRegister && typeof systemDescription === 'string' ? systemDescription.trim().slice(0, 500) || null : null,
        category: shouldRegister && typeof systemCategory === 'string' ? systemCategory : 'custom',
        isPreset: false,
        creatorId: shouldRegister ? user.id : null,
      },
    })
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      description: typeof description === 'string' ? description.trim().slice(0, 2000) : null,
      theme,
      systemId: system?.id ?? null,
      campaignType: campaignType === 'oneshot' ? 'oneshot' : 'campaign',
      contentTone: typeof contentTone === 'string' ? contentTone : null,
      playStyle: typeof playStyle === 'string' ? playStyle : null,
      sessionFrequency: typeof sessionFrequency === 'string' ? sessionFrequency : null,
      minExperience: typeof minExperience === 'string' ? minExperience : null,
      isOpen: isOpen === true,
      maxSlots: isOpen && typeof maxSlots === 'number' && maxSlots > 0 ? maxSlots : null,
      members: { create: { userId: user.id, role: 'GM' } },
    },
    include: { system: true },
  })

  return NextResponse.json(campaign, { status: 201 })
}
