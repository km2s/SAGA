import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CampaignTabs } from '@/components/campaign/CampaignTabs'
import { Crown, Map } from 'lucide-react'

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      system: true,
      _count: { select: { members: true, sessions: true } },
      sessions: { where: { isActive: true }, take: 1 },
    },
  }).catch(() => null)

  if (!campaign) notFound()

  const membership = await prisma.campaignMember.findFirst({
    where: { campaign: { id: params.id }, user: { discordId: session.user.discordId } },
  }).catch(() => null)

  if (!membership) notFound()

  const isGM = membership.role === 'GM'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-br from-[#1a0533] via-[#4a1080] to-[#7c3aed] relative flex flex-col sm:flex-row sm:items-end px-5 sm:px-8 pt-5 pb-4 sm:pb-5 gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-white drop-shadow-lg truncate">{campaign.name}</h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            {campaign.system?.name ?? 'Sistema personalizado'} · {campaign._count.members} jogadores · {campaign._count.sessions} sessões
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isGM && (
            <Link href={`/campaign/${params.id}/gm`}>
              <Button variant="secondary" className="border-white/25 bg-white/8 hover:bg-white/15 hover:border-white/40">
                <Crown size={14} className="inline mr-1.5 -mt-0.5" />
                <span className="hidden sm:inline">Painel do Mestre</span>
                <span className="sm:hidden">Mestre</span>
              </Button>
            </Link>
          )}
          <Link href={`/campaign/${params.id}/mesa`}>
            <Button variant="primary">
              <Map size={14} className="inline mr-1.5 -mt-0.5" />
              <span className="hidden sm:inline">Abrir Mesa</span>
              <span className="sm:hidden">Mesa</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-none shrink-0">
        <CampaignTabs campaignId={params.id} isGM={isGM} />
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
