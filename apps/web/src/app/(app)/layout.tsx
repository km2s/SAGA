import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { OnboardingChecklist } from '@/components/tutorial/OnboardingChecklist'
import { prisma } from 'database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    select: { role: true, campaign: { select: { id: true, name: true } } },
    orderBy: { campaign: { updatedAt: 'desc' } },
  }).catch(() => [])

  const campaigns       = memberships.map(m => m.campaign)
  const gmMemberships   = memberships.filter(m => m.role === 'GM')
  const firstCampaignId = campaigns[0]?.id ?? null
  const firstGMId       = gmMemberships[0]?.campaign.id ?? null

  return (
    <div className="parchment-bg flex h-screen overflow-hidden text-ink">
      <Sidebar campaigns={campaigns} discordClientId={process.env.DISCORD_CLIENT_ID} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
      <OnboardingChecklist
        hasCampaign={memberships.length > 0}
        firstCampaignId={firstCampaignId}
        firstGMCampaignId={firstGMId}
      />
    </div>
  )
}
