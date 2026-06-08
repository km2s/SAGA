import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

const NPC_TYPE_LABELS: Record<string, string> = {
  VILLAIN: 'Vilão', ALLY: 'Aliado', MERCHANT: 'Mercador',
  FAMILIAR: 'Familiar', MOUNT: 'Montaria', SERVANT: 'Servo', NEUTRAL: 'Neutro', OTHER: 'Outro',
}

export default async function GmPanelPage({ params }: { params: { id: string } }) {
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
  if (!myMembership || myMembership.role !== 'GM') {
    redirect(`/campaign/${params.id}`)
  }

  const activeSession = campaign.sessions[0] ?? null

  const npcs = await prisma.nPC.findMany({
    where: { campaignId: params.id },
    include: {
      linkedMember: { include: { user: true } },
      visibilities: true,
    },
    orderBy: { name: 'asc' },
  }).catch(() => [])

  const players = campaign.members.filter(m => m.role !== 'GM')

  return (
    <div className="p-8 pt-5 space-y-7">
      {/* Session control */}
      <section>
        <h2 className="font-cinzel text-base font-semibold mb-3">Controle de Sessão</h2>
        <div className="bg-surface border border-border rounded-lg p-5">
          {activeSession ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="pulse-dot" />
                <div>
                  <p className="font-medium">{activeSession.name ?? 'Sessão em andamento'}</p>
                  <p className="text-[12px] text-saga-muted">
                    Iniciada às {new Date(activeSession.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-saga-muted text-right max-w-xs">
                Use <code className="font-mono text-gold">/sessao encerrar</code> no Discord para encerrar a sessão e gerar o resumo automático.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-saga-muted">Nenhuma sessão ativa</p>
                <p className="text-[12px] text-saga-muted mt-0.5">Inicie uma sessão para os jogadores poderem entrar na mesa.</p>
              </div>
              <p className="text-[12px] text-saga-muted text-right max-w-xs">
                Use <code className="font-mono text-gold">/sessao iniciar [nome]</code> no Discord para começar.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* NPC visibility */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-cinzel text-base font-semibold">NPCs · Visibilidade</h2>
          <p className="text-[11px] text-saga-muted">
            Use <code className="font-mono text-gold">/npc liberar</code> no Discord para controlar visibilidade por jogador
          </p>
        </div>
        {npcs.length === 0 ? (
          <div className="text-sm text-saga-muted bg-surface border border-border rounded-lg px-4 py-8 text-center">
            Nenhum NPC criado. Use <code className="font-mono text-gold">/npc criar</code> no Discord.
          </div>
        ) : (
          <div className="space-y-2">
            {npcs.map(npc => (
              <div key={npc.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3 hover:border-border-bright transition-all">
                <div className="flex items-center gap-3">
                  {npc.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={npc.imageUrl} alt={npc.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-sm shrink-0">
                      {npc.type === 'VILLAIN' ? '👹' : npc.type === 'ALLY' ? '🧝' : '🗿'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm">{npc.name}</p>
                      <Badge variant="purple">{NPC_TYPE_LABELS[npc.type] ?? npc.type}</Badge>
                    </div>
                    {npc.linkedMember && (
                      <p className="text-[11px] text-saga-muted">Ligado a {npc.linkedMember.user.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={npc.isPublic ? 'success' : 'muted'}>
                    {npc.isPublic ? 'Público' : 'Restrito'}
                  </Badge>
                  <div className="flex -space-x-1">
                    {players.map(player => {
                      const vis = npc.visibilities.find((v: { memberId: string; canView: boolean }) => v.memberId === player.id)
                      const canView = npc.isPublic || (vis?.canView ?? false)
                      return (
                        <div
                          key={player.id}
                          title={`${player.user.username}: ${canView ? 'pode ver' : 'não pode ver'}`}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold
                            ${canView
                              ? 'bg-saga-success border-bg text-white'
                              : 'bg-surface-2 border-bg text-saga-dim'
                            }`}
                        >
                          {player.user.username[0]?.toUpperCase()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Players overview */}
      <section>
        <h2 className="font-cinzel text-base font-semibold mb-3">Jogadores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {players.map(m => (
            <div key={m.id} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple to-gold flex items-center justify-center text-sm font-bold shrink-0">
                {m.user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.user.username}</p>
                {m.character ? (
                  <>
                    <p className="text-[11px] text-saga-muted truncate">
                      {m.character.name} · {m.character.race ?? ''} {m.character.class ?? ''} · Nv.{m.character.level}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-surface-2 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-saga-success h-full rounded-full"
                          style={{ width: `${Math.round((m.character.hp / m.character.maxHp) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-saga-muted shrink-0">{m.character.hp}/{m.character.maxHp}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-saga-muted">Sem personagem</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="font-cinzel text-base font-semibold mb-3">Atalhos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: `/campaign/${params.id}/npcs`, label: 'Ver NPCs', icon: '🗿' },
            { href: `/campaign/${params.id}/sessions`, label: 'Sessões', icon: '📜' },
            { href: `/campaign/${params.id}/notes`, label: 'Notas', icon: '📝' },
            { href: `/campaign/${params.id}/mesa`, label: 'Mesa Virtual', icon: '🗺️' },
          ].map(link => (
            <Link key={link.href} href={link.href}>
              <div className="bg-surface border border-border rounded-lg p-4 hover:border-gold/40 hover:bg-surface-2 transition-all cursor-pointer text-center">
                <p className="text-2xl mb-1">{link.icon}</p>
                <p className="text-sm font-medium">{link.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
