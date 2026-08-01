import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { SessionSummaryEditor } from '@/components/sessions/SessionSummaryEditor'
import { Dice6, Sparkles, Trophy, Users } from 'lucide-react'

function formatDuration(startedAt: Date, endedAt: Date | null) {
  const end = endedAt ?? new Date()
  const ms = end.getTime() - startedAt.getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const auth = await getServerSession(authOptions)
  if (!auth) redirect('/login')

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { members: { include: { user: true } } },
  }).catch(() => null)
  if (!campaign) notFound()

  const myMembership = campaign.members.find(m => m.user.discordId === auth.user.discordId)
  if (!myMembership) notFound()

  const isGM = myMembership.role === 'GM'

  const gameSession = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      summary: true,
      rollLogs: { orderBy: { rolledAt: 'asc' } },
      _count: { select: { rollLogs: true } },
    },
  }).catch(() => null)

  if (!gameSession || gameSession.campaignId !== params.id) notFound()

  const topRollers = Object.entries(
    gameSession.rollLogs.reduce<Record<string, number>>((acc, r) => {
      acc[r.rolledBy] = (acc[r.rolledBy] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const highestRoll = gameSession.rollLogs.reduce<{ total: number; rolledBy: string; expression: string } | null>(
    (max, r) => (!max || r.total > max.total ? { total: r.total, rolledBy: r.rolledBy, expression: r.expression } : max),
    null
  )

  const critCount = gameSession.rollLogs.filter(r => {
    const arr = Array.isArray(r.rolls) ? (r.rolls as number[]) : []
    return arr.length === 1 && arr[0] === 20 && r.expression.includes('d20')
  }).length

  return (
    <div className="p-4 sm:p-8 sm:pt-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-soft mb-5">
        <Link href={`/campaign/${params.id}/sessions`} className="hover:text-gold transition-colors">
          ← Sessões
        </Link>
        <span>/</span>
        <span className="text-ink">{gameSession.name ?? 'Sessão sem título'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-cinzel text-2xl font-bold">{gameSession.name ?? 'Sessão sem título'}</h1>
            {gameSession.isActive
              ? <Badge variant="success">● Ativa</Badge>
              : <Badge variant="muted">Encerrada</Badge>}
          </div>
          <p className="text-sm text-ink-soft">
            {new Date(gameSession.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            {' · '}
            {formatDuration(gameSession.startedAt, gameSession.endedAt ?? null)}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Rolagens',   value: gameSession._count.rollLogs, Icon: Dice6,    color: 'text-gold' },
          { label: 'Críticos',   value: critCount,                   Icon: Sparkles, color: 'text-green-700' },
          { label: 'Maior total',value: highestRoll?.total ?? '—',   Icon: Trophy,   color: 'text-purple-bright' },
          { label: 'Jogadores',  value: campaign.members.length,     Icon: Users,    color: 'text-ink-soft' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-ink/20 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-1 text-ink-soft/50"><stat.Icon size={20} /></div>
            <p className={`font-cinzel text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-ink-soft mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Summary (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          <SessionSummaryEditor
            campaignId={params.id}
            sessionId={params.sessionId}
            initialContent={gameSession.summary?.content ?? null}
            isGM={isGM}
          />

          {/* Highlights */}
          {highestRoll && (
            <div className="bg-card border border-ink/20 rounded-lg p-5">
              <h3 className="font-cinzel text-sm font-semibold mb-3 flex items-center gap-2"><Trophy size={14} className="text-gold" /> Destaque da Sessão</h3>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gold/6 border border-gold/20">
                <p className="font-cinzel text-4xl font-bold text-gold">{highestRoll.total}</p>
                <div>
                  <p className="text-sm font-medium">{highestRoll.rolledBy}</p>
                  <p className="text-[11px] text-ink-soft">{highestRoll.expression} — maior rolagem da sessão</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Top rollers */}
          {topRollers.length > 0 && (
            <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-ink/20">
                <h3 className="font-cinzel text-sm font-semibold">Mais Ativos</h3>
              </div>
              <div className="divide-y divide-border">
                {topRollers.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[11px] text-ink-soft w-4 text-center">{i + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-purple/50 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                      {name[0]?.toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm text-ink truncate">{name}</p>
                    <span className="text-[11px] text-gold font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roll log */}
          <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-ink/20">
              <h3 className="font-cinzel text-sm font-semibold">Log de Rolagens</h3>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {gameSession.rollLogs.length === 0 ? (
                <p className="text-sm text-ink-soft text-center py-8">Nenhuma rolagem.</p>
              ) : (
                gameSession.rollLogs.slice().reverse().map(roll => {
                  const arr = Array.isArray(roll.rolls) ? (roll.rolls as number[]) : []
                  const isCrit = arr.length === 1 && arr[0] === 20 && roll.expression.includes('d20')
                  return (
                    <div key={roll.id} className={`flex items-center gap-3 px-4 py-2.5 ${isCrit ? 'bg-gold/5' : ''}`}>
                      <p className={`font-cinzel text-xl font-bold w-10 text-right shrink-0 ${isCrit ? 'text-gold' : 'text-ink'}`}>
                        {roll.total}
                      </p>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-ink-soft truncate">{roll.rolledBy}</p>
                        <p className="text-[10px] text-ink-soft font-mono">{roll.expression}</p>
                      </div>
                      {isCrit && <Sparkles size={10} className="text-gold shrink-0" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
