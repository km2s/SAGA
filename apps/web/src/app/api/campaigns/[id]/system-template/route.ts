import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      system: { include: { attributes: { orderBy: { name: 'asc' } } } },
      members: { where: { user: { discordId: session.user.discordId } } },
    },
  }).catch(() => null)

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = campaign.members[0]
  if (!member || member.role !== 'GM') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!campaign.system) return NextResponse.json({ groups: [], textSections: [] })

  const groupMap = new Map<string, { name: string; dice: string }[]>()
  const textSections: { name: string }[] = []

  for (const attr of campaign.system.attributes) {
    if (attr.defaultDie === 'text') {
      textSections.push({ name: attr.description?.replace('secao:', '') ?? attr.name })
    } else {
      const desc = attr.description ?? ''
      const groupName = desc.startsWith('grupo:') ? desc.replace('grupo:', '') : 'Atributos'
      if (!groupMap.has(groupName)) groupMap.set(groupName, [])
      groupMap.get(groupName)!.push({ name: attr.name, dice: attr.defaultDie })
    }
  }

  const groups = Array.from(groupMap.entries()).map(([name, attributes]) => ({ name, attributes }))

  return NextResponse.json({ groups, textSections })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      system: { include: { attributes: true } },
      members: { where: { user: { discordId: session.user.discordId } } },
    },
  }).catch(() => null)

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = campaign.members[0]
  if (!member || member.role !== 'GM') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    groups?: { name: string; attributes: { name: string; dice: string }[] }[]
    textSections?: { name: string }[]
  } | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const groups = (body.groups ?? []).filter(g => g.name.trim())
  const textSections = (body.textSections ?? []).filter(s => s.name.trim())

  let system = campaign.system

  if (!system) {
    system = await prisma.rPGSystem.create({
      data: {
        name: 'Personalizado',
        category: 'custom',
        isPreset: false,
        creatorId: null,
        attributes: { create: [] },
      },
      include: { attributes: true },
    })
    await prisma.campaign.update({
      where: { id: params.id },
      data: { systemId: system.id },
    })
  }

  // Collect new attribute data to upsert
  const incoming: { name: string; defaultDie: string; description: string }[] = []
  for (const group of groups) {
    for (const attr of group.attributes) {
      const name = attr.name.trim().slice(0, 80)
      if (!name) continue
      incoming.push({
        name,
        defaultDie: attr.dice || 'd20',
        description: `grupo:${group.name.trim()}`,
      })
    }
  }
  for (const sec of textSections) {
    const name = sec.name.trim().slice(0, 80)
    if (!name) continue
    incoming.push({ name, defaultDie: 'text', description: `secao:${name}` })
  }

  // Existing attributes in this system
  const existing = await prisma.systemAttribute.findMany({ where: { systemId: system.id } })
  const existingByName = new Map(existing.map(a => [a.name.toLowerCase(), a]))
  const incomingNames = new Set(incoming.map(a => a.name.toLowerCase()))

  // Update existing or create new
  for (const attr of incoming) {
    const ex = existingByName.get(attr.name.toLowerCase())
    if (ex) {
      await prisma.systemAttribute.update({
        where: { id: ex.id },
        data: { defaultDie: attr.defaultDie, description: attr.description },
      })
    } else {
      await prisma.systemAttribute.create({
        data: { ...attr, systemId: system.id },
      })
    }
  }

  // Delete attributes not in incoming AND not referenced by any character/npc
  const toRemove = existing.filter(a => !incomingNames.has(a.name.toLowerCase()))
  for (const attr of toRemove) {
    const inUse = await prisma.characterAttribute.count({ where: { attributeId: attr.id } })
    const npcInUse = await prisma.nPCAttribute.count({ where: { attributeId: attr.id } })
    if (inUse === 0 && npcInUse === 0) {
      await prisma.systemAttribute.delete({ where: { id: attr.id } }).catch(() => null)
    }
  }

  return NextResponse.json({ ok: true, systemId: system.id })
}
