import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from 'database'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { NPCVisibilityRow } from '@/components/gm/NPCVisibilityRow'
import { SessionControls } from '@/components/gm/SessionControls'
import { GMActions } from '@/components/gm/GMActions'
import { Map, Users, ScrollText, FileText, ClipboardList } from 'lucide-react'
import { CopyButton } from '@/components/ui/CopyButton'
import { MarkTutorialVisited } from '@/components/tutorial/MarkTutorialVisited'
import { ApplicationsPanel } from '@/components/gm/ApplicationsPanel'
import { CampaignStatusToggle } from '@/components/gm/CampaignStatusToggle'
import { CustomSheetBuilder } from '@/components/gm/CustomSheetBuilder'

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
      system: true,
    },
  }).catch(() => null)

  if (!campaign) notFound()

  const myMembership = campaign.members.find(m => m.user.discordId === session.user.discordId)
  if (!myMembership || myMembership.role !== 'GM') redirect(`/campaign/${params.id}`)

  const activeSession = campaign.sessions[0] ?? null

  const npcs = await prisma.nPC.findMany({
    where: { campaignId: params.id },
    include: { linkedMember: { include: { user: true } }, visibilities: true },
    orderBy: { name: 'asc' },
  }).catch(() => [])

  const players = campaign.members.filter(m => m.role !== 'GM')

  return (
    <div className="p-4 sm:p-8 sm:pt-5 space-y-7">
      <MarkTutorialVisited tutorialKey="saga_visited_gm" />
      {/* Session control */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-cinzel text-base font-semibold">Controle de Sessão</h2>
          <SessionControls campaignId={params.id} hasActiveSession={!!activeSession} />
        </div>
        <div className="bg-card border border-ink/20 rounded-lg p-5">
          {activeSession ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="pulse-dot" />
                <div>
                  <p className="font-medium">{activeSession.name ?? 'Sessão em andamento'}</p>
                  <p className="text-[12px] text-ink-soft">
                    Iniciada às {new Date(activeSession.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <Link href={`/campaign/${params.id}/mesa`}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-purple/10 border border-purple/30 text-purple-bright hover:bg-purple/20 transition-colors cursor-pointer">
                  <Map size={14} />
                  Abrir Mesa
                </div>
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-ink-soft text-sm">Nenhuma sessão ativa. Clique em &quot;Iniciar Sessão&quot; para começar.</p>
            </div>
          )}
        </div>
      </section>

      {/* NPC section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-cinzel text-base font-semibold">NPCs · Visibilidade</h2>
          <GMActions campaignId={params.id} players={players} />
        </div>
        {npcs.length === 0 ? (
          <div className="text-sm text-ink-soft bg-card border border-ink/20 rounded-lg px-4 py-8 text-center">
            Nenhum NPC criado. Clique em &quot;+ Criar NPC&quot; acima para adicionar o primeiro.
          </div>
        ) : (
          <div className="space-y-2">
            {npcs.map(npc => (
              <NPCVisibilityRow key={npc.id} npc={npc} players={players} campaignId={params.id} />
            ))}
          </div>
        )}
      </section>

      {/* Players overview */}
      <section>
        <h2 className="font-cinzel text-base font-semibold mb-3">Jogadores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {players.map(m => (
            <div key={m.id} className="bg-card border border-ink/20 rounded-lg p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple to-gold flex items-center justify-center text-sm font-bold shrink-0">
                {m.user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.user.username}</p>
                {m.character ? (
                  <>
                    <p className="text-[11px] text-ink-soft truncate">
                      {m.character.name} · {m.character.race ?? ''} {m.character.class ?? ''} · Nv.{m.character.level}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-parchment/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-saga-success h-full rounded-full"
                          style={{ width: `${Math.round((m.character.hp / m.character.maxHp) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-ink-soft shrink-0">{m.character.hp}/{m.character.maxHp}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-ink-soft">Sem personagem</p>
                )}
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-2 text-sm text-ink-soft bg-card border border-ink/20 rounded-lg px-4 py-8 text-center">
              Nenhum jogador ainda. Compartilhe o ID da campanha: <CopyButton value={params.id} />
            </div>
          )}
        </div>
      </section>

      {/* Custom sheet template — only for campaigns without a preset system */}
      {(!campaign.system || !campaign.system.isPreset) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-ink-soft" />
            <h2 className="font-cinzel text-base font-semibold">Template de Ficha</h2>
          </div>
          <p className="text-[12px] text-ink-soft mb-3">
            Defina os grupos de atributos e seções de texto que novos personagens receberão automaticamente ao entrar na campanha.
          </p>
          <CustomSheetBuilder campaignId={params.id} systemCategory={campaign.system?.category} />
        </section>
      )}

      {/* Applications */}
      <section>
        <h2 className="font-cinzel text-base font-semibold mb-3">Inscrições de Jogadores</h2>
        <div className="space-y-3">
          <CampaignStatusToggle
            campaignId={params.id}
            initialIsOpen={campaign.isOpen}
            campaignType={campaign.campaignType}
          />
          <ApplicationsPanel campaignId={params.id} />
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="font-cinzel text-base font-semibold mb-3">Atalhos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: `/campaign/${params.id}/npcs`,     label: 'Ver NPCs',     Icon: Users },
            { href: `/campaign/${params.id}/sessions`, label: 'Sessões',      Icon: ScrollText },
            { href: `/campaign/${params.id}/notes`,    label: 'Notas',        Icon: FileText },
            { href: `/campaign/${params.id}/mesa`,     label: 'Mesa Virtual', Icon: Map },
          ].map(link => (
            <Link key={link.href} href={link.href}>
              <div className="bg-card border border-ink/20 rounded-lg p-4 hover:border-gold/40 hover:bg-parchment/60 transition-all cursor-pointer text-center">
                <div className="flex justify-center mb-2">
                  <link.Icon size={22} className="text-ink-soft" />
                </div>
                <p className="text-sm font-medium">{link.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
