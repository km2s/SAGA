import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { validateImageUrlOrError } from '@/lib/validate-url'
import { withNoCache } from '@/lib/no-cache'

async function resolveAccess(campaignId: string, npcId: string, discordId: string) {
  const member = await prisma.campaignMember.findFirst({
    where: { campaignId, user: { discordId } },
  }).catch(() => null)
  if (!member) return null

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId },
    include: {
      attributes: { include: { attribute: true } },
      linkedMember: { include: { user: true } },
      visibilities: true,
    },
  }).catch(() => null)
  if (!npc) return null

  const isGM = member.role === 'GM'
  const canView = isGM || npc.isPublic ||
    npc.visibilities.some(v => v.memberId === member.id && v.canView)

  return { npc, member, isGM, canView }
}

export async function GET(_req: Request, { params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await resolveAccess(params.id, params.npcId, session.user.discordId)
  if (!access || !access.canView) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return withNoCache(NextResponse.json(access.npc))
}

export async function PATCH(req: Request, { params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await resolveAccess(params.id, params.npcId, session.user.discordId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!access.isGM) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const body = await req.json() as {
    name?: string; description?: string; imageUrl?: string; type?: string
    race?: string; class?: string; level?: number; hp?: number; maxHp?: number
    isPublic?: boolean; linkedMemberId?: string | null; folderId?: string | null
  }

  // folderId: valida que a pasta pertence a esta campanha (null = sem pasta)
  if (body.folderId !== undefined && body.folderId !== null) {
    const folder = await prisma.npcFolder.findFirst({
      where: { id: body.folderId, campaignId: params.id },
      select: { id: true },
    }).catch(() => null)
    if (!folder) return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
  }

  let imageUrl: string | null = null
  if (body.imageUrl !== undefined) {
    if (body.imageUrl) {
      const { value, error } = validateImageUrlOrError(body.imageUrl, 'imageUrl')
      if (error) return NextResponse.json({ error }, { status: 400 })
      imageUrl = value
    }
  }

  const VALID_NPC_TYPES = ['ALLY', 'NEUTRAL', 'ENEMY']
  if (body.type !== undefined && !VALID_NPC_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'type deve ser ALLY, NEUTRAL ou ENEMY' }, { status: 400 })
  }

  const updated = await prisma.nPC.update({
    where: { id: params.npcId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim().slice(0, 100) }),
      ...(body.description !== undefined && { description: body.description?.trim().slice(0, 500) || null }),
      ...(body.imageUrl !== undefined && { imageUrl: imageUrl }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.race !== undefined && { race: body.race?.trim() || null }),
      ...(body.class !== undefined && { class: body.class?.trim() || null }),
      ...(body.level !== undefined && { level: Math.max(1, body.level) }),
      ...(body.hp !== undefined && { hp: Math.max(0, body.hp) }),
      ...(body.maxHp !== undefined && { maxHp: Math.max(0, body.maxHp) }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.linkedMemberId !== undefined && { linkedMemberId: body.linkedMemberId }),
      ...(body.folderId !== undefined && { folderId: body.folderId }),
    },
    include: {
      attributes: { include: { attribute: true } },
      linkedMember: { include: { user: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string; npcId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  // NPCAttribute e NPCVisibility não têm onDelete: Cascade no schema, então
  // precisam ser removidos antes do NPC — senão o delete falha por constraint
  // de FK (as demais relações — TextField/Weapon/SpellSlot — já são cascade).
  try {
    await prisma.$transaction([
      prisma.nPCAttribute.deleteMany({ where: { npcId: params.npcId } }),
      prisma.nPCVisibility.deleteMany({ where: { npcId: params.npcId } }),
      prisma.nPC.delete({ where: { id: params.npcId } }),
    ])
  } catch {
    return NextResponse.json({ error: 'Falha ao deletar o NPC' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
