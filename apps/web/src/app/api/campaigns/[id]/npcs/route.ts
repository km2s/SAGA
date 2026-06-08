import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'GM only' }, { status: 403 })

  const body = await req.json() as {
    name?: string; description?: string; imageUrl?: string; type?: string
    race?: string; class?: string; level?: number; hp?: number; maxHp?: number
    isPublic?: boolean; linkedMemberId?: string
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const imageUrl = body.imageUrl?.trim() || null
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: 'imageUrl inválida' }, { status: 400 })
  }

  let linkedMemberId: string | null = null
  if (body.linkedMemberId) {
    const linked = await prisma.campaignMember.findFirst({
      where: { id: body.linkedMemberId, campaignId: params.id },
    }).catch(() => null)
    if (!linked) return NextResponse.json({ error: 'Membro vinculado não encontrado nesta campanha' }, { status: 400 })
    linkedMemberId = linked.id
  }

  const npc = await prisma.nPC.create({
    data: {
      name: body.name.trim().slice(0, 100),
      description: body.description?.trim().slice(0, 500) || null,
      imageUrl,
      type: body.type ?? 'NEUTRAL',
      race: body.race?.trim() || null,
      class: body.class?.trim() || null,
      level: body.level ? Math.max(1, body.level) : 1,
      hp: body.hp ?? 10,
      maxHp: body.maxHp ?? 10,
      isPublic: body.isPublic ?? false,
      campaignId: params.id,
      linkedMemberId,
    },
    include: { linkedMember: { include: { user: true } }, visibilities: true },
  })

  return NextResponse.json(npc, { status: 201 })
}
