import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { DashboardActions } from '@/components/campaign/DashboardActions'
import { Swords } from 'lucide-react'
import { getServerT } from '@/lib/i18n/getServerT'

const COVER_GRADIENTS = [
  'from-[#1a0533] via-[#4a1080] to-[#7c3aed]',
  'from-[#1a0a00] via-[#5c2800] to-[#c9622a]',
  'from-[#001a1a] via-[#004040] to-[#0a9090]',
  'from-[#0a1a00] via-[#2a4800] to-[#5a8800]',
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const t = getServerT()

  const memberships = await prisma.campaignMember.findMany({
    where: { user: { discordId: session.user.discordId } },
    include: {
      campaign: {
        include: {
          system: true,
          _count: { select: { members: true } },
          sessions: { where: { isActive: true }, take: 1 },
        },
      },
    },
    orderBy: { campaign: { updatedAt: 'desc' } },
  }).catch(() => [])

  const activeSessionCount = memberships.filter(m => m.campaign.sessions.length > 0).length

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-cinzel text-2xl font-semibold text-saga-text">
            {t.dashboard.welcome} {session.user.username}
          </h1>
          <p className="text-sm text-saga-muted mt-1">
            {memberships.length} {memberships.length !== 1 ? t.dashboard.campaignsPlural : t.dashboard.campaigns}
            {activeSessionCount > 0 && ` · ${activeSessionCount} ${activeSessionCount !== 1 ? t.dashboard.activeSessions : t.dashboard.activeSession}`}
          </p>
        </div>
        <DashboardActions />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {memberships.map((m, i) => {
          const hasSession = m.campaign.sessions.length > 0
          const gradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length]

          return (
            <Link key={m.campaign.id} href={`/campaign/${m.campaign.id}`}>
              <div className="bg-surface border border-border rounded-lg overflow-hidden cursor-pointer card-hover">
                {/* Cover */}
                <div className={`h-28 bg-gradient-to-br ${gradient} relative`}>
                  {hasSession && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="success">{t.dashboard.activeSessionBadge}</Badge>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="font-cinzel text-sm font-semibold text-saga-text mb-2 truncate">
                    {m.campaign.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={m.role === 'GM' ? 'gold' : 'purple'}>
                      {m.role === 'GM' ? t.dashboard.roleGm : t.dashboard.rolePlayer}
                    </Badge>
                    <span className="text-[11px] text-saga-muted">
                      {m.campaign._count.members} {t.dashboard.players}
                    </span>
                    {m.campaign.system && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-saga-dim" />
                        <span className="text-[11px] text-saga-muted">{m.campaign.system.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {/* New campaign placeholder card */}
        {memberships.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <Swords size={48} className="text-saga-muted/30 mb-4" />
            <p className="font-cinzel text-lg text-saga-muted">{t.dashboard.noCampaigns}</p>
            <p className="text-sm text-saga-muted mt-1 max-w-sm">
              {t.dashboard.noCampaignsHint}{' '}
              <code className="font-mono text-gold">/campanha entrar</code>{' '}
              {t.dashboard.noCampaignsDiscord}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
