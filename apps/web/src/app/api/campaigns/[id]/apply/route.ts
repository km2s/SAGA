import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { notifyGMApplicationReceived } from '@/lib/discord-notify'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      members: { where: { role: 'GM' }, include: { user: { select: { discordId: true } } }, take: 1 },
    },
  }).catch(() => null)
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
  if (!campaign.isOpen) return NextResponse.json({ error: 'Esta campanha não está aceitando inscrições' }, { status: 403 })

  // Prevent applying if already a member
  const existing = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId: params.id } },
  }).catch(() => null)
  if (existing) return NextResponse.json({ error: 'Você já é membro desta campanha' }, { status: 409 })

  // Check slots
  if (campaign.maxSlots !== null) {
    const memberCount = await prisma.campaignMember.count({
      where: { campaignId: params.id, role: 'PLAYER' },
    }).catch(() => 0)
    if (memberCount >= campaign.maxSlots) {
      return NextResponse.json({ error: 'Campanha sem vagas disponíveis' }, { status: 409 })
    }
  }

  const body = await req.json().catch(() => ({})) as { characterDesc?: string; experienceLevel?: string }
  const characterDesc   = typeof body.characterDesc === 'string' ? body.characterDesc.trim().slice(0, 1000) : ''
  const experienceLevel = ['beginner', 'intermediate', 'advanced'].includes(body.experienceLevel ?? '')
    ? (body.experienceLevel as string)
    : 'beginner'

  const application = await prisma.campaignApplication.upsert({
    where: { campaignId_userId: { campaignId: params.id, userId: user.id } },
    create: { campaignId: params.id, userId: user.id, characterDesc, experienceLevel, status: 'pending' },
    update: { characterDesc, experienceLevel, status: 'pending' },
  }).catch(() => null)
  if (!application) return NextResponse.json({ error: 'Erro ao registrar inscrição' }, { status: 500 })

  // Notify GM via Discord DM
  const gmDiscordId = campaign.members[0]?.user.discordId
  if (gmDiscordId) {
    void notifyGMApplicationReceived(gmDiscordId, campaign.name, session.user.username, params.id)
  }

  return NextResponse.json(application, { status: 201 })
}
