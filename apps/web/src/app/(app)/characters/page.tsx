import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import { CharactersView } from '@/components/character/CharactersView'

export default async function CharactersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    include: {
      memberships: {
        include: {
          campaign: { include: { system: true } },
          character: true,
        },
      },
    },
  }).catch(() => null)

  if (!user) redirect('/login')

  // Only non-GM memberships without an existing character
  const allCampaigns = user.memberships
    .filter(m => m.role !== 'GM' && !m.character)
    .map(m => ({
      id: m.campaign.id,
      name: m.campaign.name,
      system: m.campaign.system
        ? { id: m.campaign.system.id, name: m.campaign.system.name, category: m.campaign.system.category }
        : null,
    }))

  // Player memberships — shown in "Jogador" tab (all roles, but only those with a character)
  const playerMemberships = user.memberships
    .filter(m => m.role !== 'GM')
    .map(m => ({
      id: m.id,
      role: m.role,
      character: m.character,
      campaign: { id: m.campaign.id, name: m.campaign.name, system: m.campaign.system ? { name: m.campaign.system.name } : null },
    }))

  // GM campaigns — shown in "Mestre" tab with their NPCs
  const gmMembershipIds = user.memberships
    .filter(m => m.role === 'GM')
    .map(m => m.campaign.id)

  const gmCampaigns = gmMembershipIds.length > 0
    ? await prisma.campaign.findMany({
        where: { id: { in: gmMembershipIds } },
        include: {
          members: {
            where: { role: { not: 'GM' } },
            include: { user: { select: { username: true } } },
          },
          npcs: {
            orderBy: { name: 'asc' },
            select: { id: true, name: true, type: true, description: true, imageUrl: true, isPublic: true },
          },
        },
        orderBy: { name: 'asc' },
      }).catch(() => [])
    : []

  return (
    <CharactersView
      playerMemberships={playerMemberships}
      gmCampaigns={gmCampaigns}
      allCampaigns={allCampaigns}
    />
  )
}
