import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; npcId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gmMember = await prisma.campaignMember.findFirst({
    where: {
      campaignId: params.id,
      user: { discordId: session.user.discordId },
      role: 'GM',
    },
  }).catch(() => null)
  if (!gmMember) return NextResponse.json({ error: 'Forbidden — GM only' }, { status: 403 })

  const npc = await prisma.nPC.findFirst({
    where: { id: params.npcId, campaignId: params.id },
  }).catch(() => null)
  if (!npc) return NextResponse.json({ error: 'NPC not found' }, { status: 404 })

  const raw: unknown = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const body = raw as Record<string, unknown>
  const memberId = body['memberId']
  const canView = body['canView']

  if (typeof memberId !== 'string' || typeof canView !== 'boolean') {
    return NextResponse.json({ error: 'memberId e canView são obrigatórios' }, { status: 400 })
  }

  const targetMember = await prisma.campaignMember.findFirst({
    where: { id: memberId, campaignId: params.id },
  }).catch(() => null)
  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const visibility = await prisma.nPCVisibility.upsert({
    where: { npcId_memberId: { npcId: params.npcId, memberId } },
    update: { canView },
    create: { npcId: params.npcId, memberId, canView },
  })

  return NextResponse.json(visibility)
}
