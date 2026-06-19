import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { getServerT } from '@/lib/i18n/getServerT'

function formatDuration(startedAt: Date, endedAt: Date | null) {
  const end = endedAt ?? new Date()
  const ms = end.getTime() - startedAt.getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function CampaignSessionsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const t = getServerT()

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { members: { include: { user: true } } },
  }).catch(() => null)

  if (!campaign) notFound()

  const myMembership = campaign.members.find(m => m.user.discordId === session.user.discordId)
  if (!myMembership) notFound()

  const sessions = await prisma.session.findMany({
    where: { campaignId: params.id },
    include: { _count: { select: { rollLogs: true } }, summary: true },
    orderBy: { startedAt: 'desc' },
  }).catch(() => [])

  const activeSession = sessions.find(s => s.isActive)
  const pastSessions = sessions.filter(s => !s.isActive)

  return (
    <div className="p-4 sm:p-8 sm:pt-5">
      <h2 className="font-cinzel text-lg font-semibold mb-4">{t.sessions.title}</h2>

      {/* Active session */}
      {activeSession && (
        <div className="mb-6">
          <p className="text-[11px] text-saga-muted font-bold uppercase tracking-widest mb-2">{t.sessions.active}</p>
          <Link href={`/campaign/${params.id}/sessions/${activeSession.id}`}>
            <div className="bg-surface border border-saga-success/30 rounded-lg p-5 hover:border-saga-success/50 transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="pulse-dot" />
                    <h3 className="font-cinzel font-semibold">{activeSession.name ?? t.sessions.noTitle}</h3>
                    <Badge variant="success">{t.sessions.activeBadge}</Badge>
                  </div>
                  <p className="text-[12px] text-saga-muted">
                    {t.sessions.startedAt} {new Date(activeSession.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' · '}{t.sessions.duration} {formatDuration(activeSession.startedAt, null)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gold font-cinzel">{activeSession._count.rollLogs}</p>
                  <p className="text-[11px] text-saga-muted">{t.sessions.rolls}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Past sessions */}
      <div>
        <p className="text-[11px] text-saga-muted font-bold uppercase tracking-widest mb-2">
          {t.sessions.historyTitle} · {pastSessions.length} {pastSessions.length !== 1 ? t.sessions.sessions : t.sessions.session}
        </p>
        {pastSessions.length === 0 ? (
          <div className="text-sm text-saga-muted bg-surface border border-border rounded-lg px-4 py-10 text-center">
            {t.sessions.noHistory}
          </div>
        ) : (
          <div className="space-y-2">
            {pastSessions.map((s, i) => (
              <Link key={s.id} href={`/campaign/${params.id}/sessions/${s.id}`}>
                <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-4 hover:border-border-bright hover:bg-surface-2 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[11px] text-saga-muted font-bold shrink-0">
                      {pastSessions.length - i}
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-gold transition-colors">
                        {s.name ?? `${t.sessions.sessionNumber} ${pastSessions.length - i}`}
                      </p>
                      <p className="text-[11px] text-saga-muted">
                        {new Date(s.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {s.endedAt && ` · ${formatDuration(s.startedAt, s.endedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gold">{s._count.rollLogs}</p>
                      <p className="text-[11px] text-saga-muted">{t.sessions.rolls}</p>
                    </div>
                    {s.summary ? (
                      <Badge variant="purple">{t.sessions.summaryBadge}</Badge>
                    ) : (
                      <Badge variant="muted">{t.sessions.noSummaryBadge}</Badge>
                    )}
                    <span className="text-saga-muted group-hover:text-gold transition-colors text-sm">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
