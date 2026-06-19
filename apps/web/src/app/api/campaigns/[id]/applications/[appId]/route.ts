import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { notifyPlayerApplicationApproved, notifyPlayerApplicationRejected } from '@/lib/discord-notify'

export async function PATCH(req: Request, { params }: { params: { id: string; appId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.campaignMember.findFirst({
    where: { campaignId: params.id, user: { discordId: session.user.discordId }, role: 'GM' },
  }).catch(() => null)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { status?: string }
  const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : null
  if (!status) return NextResponse.json({ error: 'status deve ser approved ou rejected' }, { status: 400 })

  const application = await prisma.campaignApplication.findUnique({
    where: { id: params.appId },
    include: {
      user: { select: { discordId: true } },
      campaign: { select: { name: true } },
    },
  }).catch(() => null)
  if (!application || application.campaignId !== params.id) {
    return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
  }
  if (application.status !== 'pending') {
    return NextResponse.json({ error: 'Inscrição já processada' }, { status: 409 })
  }

  const updated = await prisma.campaignApplication.update({
    where: { id: params.appId },
    data: { status },
  }).catch(() => null)
  if (!updated) return NextResponse.json({ error: 'Erro ao atualizar inscrição' }, { status: 500 })

  const playerDiscordId = application.user.discordId
  const campaignName = application.campaign.name

  if (status === 'approved') {
    await prisma.campaignMember.upsert({
      where: { userId_campaignId: { userId: application.userId, campaignId: params.id } },
      create: { userId: application.userId, campaignId: params.id, role: 'PLAYER' },
      update: {},
    }).catch(() => {})

    if (playerDiscordId) {
      notifyPlayerApplicationApproved(playerDiscordId, campaignName, params.id).catch(() => null)
    }
  } else if (status === 'rejected') {
    if (playerDiscordId) {
      notifyPlayerApplicationRejected(playerDiscordId, campaignName).catch(() => null)
    }
  }

  return NextResponse.json(updated)
}
