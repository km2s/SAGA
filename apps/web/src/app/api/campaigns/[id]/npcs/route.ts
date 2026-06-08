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
    name?: string
    description?: string
    imageUrl?: string
    type?: string
    isPublic?: boolean
    linkedMemberId?: string
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const npc = await prisma.nPC.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      type: body.type ?? 'NEUTRAL',
      isPublic: body.isPublic ?? false,
      campaignId: params.id,
      linkedMemberId: body.linkedMemberId || null,
    },
    include: { linkedMember: { include: { user: true } }, visibilities: true },
  })

  return NextResponse.json(npc, { status: 201 })
}
