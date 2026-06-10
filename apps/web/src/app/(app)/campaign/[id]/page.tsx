import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default async function CampaignOverviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: true, character: true },
        orderBy: { role: 'asc' },
      },
      sessions: { where: { isActive: true }, take: 1 },
    },
  }).catch(() => null)

  if (!campaign) notFound()

  const myMembership = campaign.members.find(m => m.user.discordId === session.user.discordId)
  if (!myMembership) notFound()

  const activeSession = campaign.sessions[0] ?? null

  const recentRolls = activeSession
    ? await prisma.rollLog.findMany({
        where: { sessionId: activeSession.id },
        orderBy: { rolledAt: 'desc' },
        take: 8,
      }).catch(() => [])
    : []

  return (
    <div className="p-4 sm:p-8 sm:pt-5">
      {/* Active session banner */}
      {activeSession && (
        <div className="flex items-center justify-between bg-success-dim border border-saga-success/20 rounded-lg px-5 py-3.5 mb-5">
          <div className="flex items-center gap-3">
            <div className="pulse-dot" />
            <div>
              <p className="text-sm font-semibold">{activeSession.name ?? 'Sessão em andamento'}</p>
              <p className="text-[11px] text-saga-muted">
                Iniciada às {new Date(activeSession.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/campaign/${params.id}/sessions`}>
              <Button variant="secondary">Ver resumo</Button>
            </Link>
            <Link href={`/campaign/${params.id}/mesa`}>
              <Button variant="primary">Entrar na sessão →</Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
        {/* Roll log */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-[11px] font-bold text-saga-muted uppercase tracking-widest">
            Log de Rolagens — {activeSession ? 'Sessão atual' : 'Nenhuma sessão ativa'}
          </div>
          {recentRolls.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-saga-muted">
              {activeSession
                ? 'Nenhuma rolagem ainda nesta sessão.'
                : 'Inicie uma sessão pelo bot ou pelo Painel do Mestre.'}
            </div>
          ) : (
            recentRolls.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple flex items-center justify-center text-[11px] font-bold shrink-0">
                    {r.rolledBy[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.rolledBy}</p>
                    <p className="text-[11px] text-saga-muted">
                      {r.attribute ? `${r.attribute} · ` : ''}{r.expression}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-cinzel text-xl font-bold text-gold">{r.total}</p>
                  <p className="text-[11px] text-saga-muted">[{(r.rolls as number[]).join(', ')}]</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Members */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-[11px] font-bold text-saga-muted uppercase tracking-widest flex items-center justify-between">
            Jogadores
            <Badge variant="success">{campaign.members.length} membros</Badge>
          </div>
          {campaign.members.map(m => (
            <div key={m.id} className="flex items-center gap-2.5 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-2 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-gold flex items-center justify-center text-xs font-bold shrink-0">
                {m.user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{m.user.username}</p>
                  {m.role === 'GM' && <Badge variant="gold">Mestre</Badge>}
                </div>
                <p className="text-[11px] text-saga-muted truncate">
                  {m.character ? `${m.character.name} · Nv.${m.character.level}` : 'Sem personagem'}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-saga-dim shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
