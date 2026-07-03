import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

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
      <h2 className="font-cinzel text-lg font-semibold mb-4">Sessões</h2>

      {/* Active session */}
      {activeSession && (
        <div className="mb-6">
          <p className="text-[11px] text-ink-soft font-bold uppercase tracking-widest mb-2">Em andamento</p>
          <Link href={`/campaign/${params.id}/sessions/${activeSession.id}`}>
            <div className="bg-[#f5ecd6] border border-saga-success/30 rounded-lg p-5 hover:border-saga-success/50 transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="pulse-dot" />
                    <h3 className="font-cinzel font-semibold">{activeSession.name ?? 'Sessão sem título'}</h3>
                    <Badge variant="success">Ativa</Badge>
                  </div>
                  <p className="text-[12px] text-ink-soft">
                    Iniciada em {new Date(activeSession.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' · '}Duração: {formatDuration(activeSession.startedAt, null)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gold font-cinzel">{activeSession._count.rollLogs}</p>
                  <p className="text-[11px] text-ink-soft">rolagens</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Past sessions */}
      <div>
        <p className="text-[11px] text-ink-soft font-bold uppercase tracking-widest mb-2">
          Histórico · {pastSessions.length} sessão{pastSessions.length !== 1 ? 'ões' : ''}
        </p>
        {pastSessions.length === 0 ? (
          <div className="text-sm text-ink-soft bg-[#f5ecd6] border border-ink/20 rounded-lg px-4 py-10 text-center">
            Nenhuma sessão encerrada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {pastSessions.map((s, i) => (
              <Link key={s.id} href={`/campaign/${params.id}/sessions/${s.id}`}>
                <div className="flex items-center justify-between bg-[#f5ecd6] border border-ink/20 rounded-lg px-5 py-4 hover:border-wax hover:bg-parchment/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-parchment/60 border border-ink/20 flex items-center justify-center text-[11px] text-ink-soft font-bold shrink-0">
                      {pastSessions.length - i}
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-gold transition-colors">
                        {s.name ?? `Sessão ${pastSessions.length - i}`}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        {new Date(s.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {s.endedAt && ` · ${formatDuration(s.startedAt, s.endedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gold">{s._count.rollLogs}</p>
                      <p className="text-[11px] text-ink-soft">rolagens</p>
                    </div>
                    {s.summary ? (
                      <Badge variant="purple">Resumo</Badge>
                    ) : (
                      <Badge variant="muted">Sem resumo</Badge>
                    )}
                    <span className="text-ink-soft group-hover:text-gold transition-colors text-sm">→</span>
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
