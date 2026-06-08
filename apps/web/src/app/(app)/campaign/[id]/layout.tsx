import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CampaignTabs } from '@/components/campaign/CampaignTabs'

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
      <div className="h-36 bg-gradient-to-br from-[#1a0533] via-[#4a1080] to-[#7c3aed] relative flex items-end px-8 pb-5 shrink-0">
        <div>
          <h1 className="font-cinzel text-2xl font-bold drop-shadow-lg">{campaign.name}</h1>
          <p className="text-sm text-white/60 mt-1">
            {campaign.system?.name ?? 'Sistema personalizado'} · {campaign._count.members} jogadores · {campaign._count.sessions} sessões
          </p>
        </div>
        <div className="absolute top-4 right-6 flex gap-2">
          {isGM && (
            <Link href={`/campaign/${params.id}/gm`}>
              <Button variant="secondary">⚔️ Painel do Mestre</Button>
            </Link>
          )}
          <Link href={`/campaign/${params.id}/mesa`}>
            <Button variant="primary">🗺️ Abrir Mesa</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <CampaignTabs campaignId={params.id} isGM={isGM} />

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
