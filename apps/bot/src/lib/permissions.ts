import { prisma } from 'database'

export async function getOrCreateUser(discordId: string, username: string) {
  return prisma.user.upsert({
    where: { discordId },
    update: { username },
    create: { discordId, username },
  })
}

export async function getCampaignByGuild(guildId: string) {
  return prisma.campaign.findFirst({
    where: { guildId },
    include: { system: { include: { attributes: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getMember(discordId: string, campaignId: string) {
  return prisma.campaignMember.findFirst({
    where: { user: { discordId }, campaignId },
    include: {
      user: true,
      character: { include: { attributes: { include: { attribute: true } } } },
    },
  })
}

export async function isGM(discordId: string, campaignId: string) {
  const member = await prisma.campaignMember.findFirst({
    where: { user: { discordId }, campaignId },
  })
  return member?.role === 'GM'
}

export async function getActiveSession(campaignId: string) {
  return prisma.session.findFirst({
    where: { campaignId, isActive: true },
    orderBy: { startedAt: 'desc' },
  })
}

export async function canViewNPC(discordId: string, npcId: string) {
  const npc = await prisma.nPC.findUnique({
    where: { id: npcId },
    include: {
      visibilities: { include: { member: { include: { user: true } } } },
    },
  })
  if (!npc) return false
  if (npc.isPublic) return true
  return npc.visibilities.some((v: { canView: boolean; member: { user: { discordId: string } } }) => v.member.user.discordId === discordId && v.canView)
}

export function formatDuration(startedAt: Date): string {
  const ms = Date.now() - startedAt.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}
