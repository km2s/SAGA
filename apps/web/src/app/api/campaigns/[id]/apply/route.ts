import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { NextResponse } from 'next/server'
import { notifyGMApplicationReceived } from '@/lib/discord-notify'
import { applySchema, parseBody } from '@/lib/schemas'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logSecurity } from '@/lib/security-log'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 inscrições por hora por usuário por campanha
  const rateLimitRes = applyRateLimit(
    `apply:${session.user.discordId}:${params.id}`,
    RATE_LIMITS.apply,
  )
  if (rateLimitRes) {
    logSecurity({ event: 'rate_limit.exceeded', userId: session.user.discordId, campaignId: params.id, path: '/api/campaigns/[id]/apply' })
    return rateLimitRes
  }

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

  // Impede inscrição se já for membro
  const existing = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId: params.id } },
  }).catch(() => null)
  if (existing) return NextResponse.json({ error: 'Você já é membro desta campanha' }, { status: 409 })

  // Verificar vagas
  if (campaign.maxSlots !== null) {
    const memberCount = await prisma.campaignMember.count({
      where: { campaignId: params.id, role: 'PLAYER' },
    }).catch(() => 0)
    if (memberCount >= campaign.maxSlots) {
      return NextResponse.json({ error: 'Campanha sem vagas disponíveis' }, { status: 409 })
    }
  }

  const raw  = await req.json().catch(() => ({}))
  const parsed = parseBody(applySchema, raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { characterDesc, experienceLevel } = parsed.data

  // Verificar se já existe inscrição pendente (para decidir se notifica o GM)
  const previousApplication = await prisma.campaignApplication.findUnique({
    where: { campaignId_userId: { campaignId: params.id, userId: user.id } },
    select: { status: true },
  }).catch(() => null)

  const application = await prisma.campaignApplication.upsert({
    where: { campaignId_userId: { campaignId: params.id, userId: user.id } },
    create: { campaignId: params.id, userId: user.id, characterDesc, experienceLevel, status: 'pending' },
    update: { characterDesc, experienceLevel, status: 'pending' },
  }).catch(() => null)
  if (!application) return NextResponse.json({ error: 'Erro ao registrar inscrição' }, { status: 500 })

  logSecurity({ event: 'campaign.applied', userId: session.user.discordId, campaignId: params.id })

  // Notifica o GM apenas se não havia inscrição pendente anterior (evita spam de DM)
  const gmDiscordId = campaign.members[0]?.user.discordId
  if (gmDiscordId && previousApplication?.status !== 'pending') {
    void notifyGMApplicationReceived(gmDiscordId, campaign.name, session.user.username, params.id)
  }

  return NextResponse.json(application, { status: 201 })
}
