import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

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

  return NextResponse.json(access.npc)
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
    isPublic?: boolean; linkedMemberId?: string | null
  }

  const imageUrl = body.imageUrl?.trim() || null
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: 'imageUrl inválida' }, { status: 400 })
  }

  const updated = await prisma.nPC.update({
    where: { id: params.npcId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim().slice(0, 100) }),
      ...(body.description !== undefined && { description: body.description?.trim().slice(0, 500) || null }),
      ...(body.imageUrl !== undefined && { imageUrl }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.race !== undefined && { race: body.race?.trim() || null }),
      ...(body.class !== undefined && { class: body.class?.trim() || null }),
      ...(body.level !== undefined && { level: Math.max(1, body.level) }),
      ...(body.hp !== undefined && { hp: Math.max(0, body.hp) }),
      ...(body.maxHp !== undefined && { maxHp: Math.max(0, body.maxHp) }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.linkedMemberId !== undefined && { linkedMemberId: body.linkedMemberId }),
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

  await prisma.nPC.delete({ where: { id: params.npcId } }).catch(() => null)
  return new NextResponse(null, { status: 204 })
}
