import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

export default async function VirtualTablePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const membership = await prisma.campaignMember.findFirst({
    where: {
      campaignId: params.id,
      user: { discordId: session.user.discordId },
    },
    include: { campaign: true },
  }).catch(() => null)

  if (!membership) notFound()

  const activeSession = await prisma.session.findFirst({
    where: { campaignId: params.id, isActive: true },
    include: {
      rollLogs: {
        orderBy: { rolledAt: 'desc' },
        take: 30,
      },
    },
  }).catch(() => null)

  return (
    <div className="h-full flex flex-col bg-[#070710]">
      {/* Top bar */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-surface">
        <div className="flex items-center gap-3">
          <p className="font-cinzel text-sm font-semibold">{membership.campaign.name}</p>
          {activeSession ? (
            <div className="flex items-center gap-1.5">
              <div className="pulse-dot scale-75" />
              <Badge variant="success">Sessão ativa</Badge>
            </div>
          ) : (
            <Badge variant="muted">Nenhuma sessão</Badge>
          )}
        </div>
        <p className="text-[11px] text-saga-muted">Mesa Virtual — Em desenvolvimento</p>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl mb-4">🗺️</div>
            <p className="font-cinzel text-xl font-semibold text-saga-text mb-2">Mesa Virtual</p>
            <p className="text-sm text-saga-muted max-w-xs">
              O mapa interativo está em desenvolvimento. Por enquanto, use o bot no Discord para rolar dados e gerenciar a sessão.
            </p>
          </div>
        </div>

        {/* Roll log sidebar */}
        <div className="w-72 border-l border-border flex flex-col shrink-0 bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] font-bold text-saga-muted uppercase tracking-widest">Log de Rolagens</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!activeSession || activeSession.rolls.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-saga-muted">
                {activeSession
                  ? 'Nenhuma rolagem ainda.'
                  : 'Inicie uma sessão para ver as rolagens.'}
              </div>
            ) : (
              activeSession.rollLogs.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-purple flex items-center justify-center text-[10px] font-bold shrink-0">
                      {r.rolledBy[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">{r.rolledBy}</p>
                      <p className="text-[10px] text-saga-muted">{r.expression}</p>
                    </div>
                  </div>
                  <p className="font-cinzel font-bold text-gold text-sm shrink-0 ml-2">{r.total}</p>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-saga-muted text-center">
              Use <code className="font-mono text-gold">+rolar</code> no Discord
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
