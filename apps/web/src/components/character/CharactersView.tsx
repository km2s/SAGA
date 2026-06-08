'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { CharactersActions } from './CharactersActions'
import { GMActions } from '@/components/gm/GMActions'
import {
  Swords, Sparkles, Shield, Sword, Plus, Axe, Leaf, Music, Target, Dumbbell,
  Wand2, Moon, ScrollText, User, BookOpen, ShieldAlert, UserCheck, Heart, Wind, ExternalLink,
} from 'lucide-react'

const CLASS_ICONS: Record<string, React.ElementType> = {
  Guerreiro: Swords, Mago: Sparkles, Paladino: Shield, Ladino: Sword, Clérigo: Plus,
  Bárbaro: Axe, Druida: Leaf, Bardo: Music, Ranger: Target, Monge: Dumbbell,
  Feiticeiro: Wand2, Bruxo: Moon, Arcanista: ScrollText,
}

const NPC_TYPE_LABELS: Record<string, string> = {
  VILLAIN: 'Vilão', ALLY: 'Aliado', MERCHANT: 'Mercador',
  FAMILIAR: 'Familiar', MOUNT: 'Montaria', SERVANT: 'Servo',
  NEUTRAL: 'Neutro', OTHER: 'Outro',
}

const NPC_TYPE_ICONS: Record<string, React.ElementType> = {
  VILLAIN: ShieldAlert, ALLY: UserCheck, FAMILIAR: Heart, MOUNT: Wind,
}

interface NPC {
  id: string; name: string; type: string
  description: string | null; imageUrl: string | null; isPublic: boolean
}
interface GMCampaign {
  id: string; name: string
  npcs: NPC[]
  members: { id: string; user: { username: string } }[]
}
interface Character {
  id: string; name: string; race: string | null; class: string | null
  level: number; hp: number; maxHp: number; imageUrl: string | null
}
const CAMPAIGN_COLORS = [
  'from-[#3b0764] to-[#7c3aed]',
  'from-[#1e3a5f] to-[#2563eb]',
  'from-[#064e3b] to-[#059669]',
  'from-[#7c2d12] to-[#d97706]',
  'from-[#4a044e] to-[#db2777]',
  'from-[#0c4a6e] to-[#0891b2]',
]

interface PlayerMembership {
  id: string; role: string
  character: Character | null
  campaign: { id: string; name: string; system: { name: string } | null }
}

interface Props {
  playerMemberships: PlayerMembership[]
  gmCampaigns: GMCampaign[]
  allCampaigns: { id: string; name: string }[]
}

export function CharactersView({ playerMemberships, gmCampaigns, allCampaigns }: Props) {
  const hasGMRole = gmCampaigns.length > 0
  const [tab, setTab] = useState<'player' | 'gm'>(
    playerMemberships.filter(m => m.character).length === 0 && hasGMRole ? 'gm' : 'player'
  )

  const charMemberships = playerMemberships.filter(m => m.character !== null)

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-cinzel text-2xl font-bold">Meus Personagens</h1>
          <p className="text-sm text-saga-muted mt-1">
            {tab === 'player' ? 'Fichas dos seus personagens em todas as campanhas' : 'NPCs das suas campanhas como Mestre'}
          </p>
        </div>
        {tab === 'player' && <CharactersActions campaigns={allCampaigns} />}
      </div>

      {/* Tabs — only show if user has GM roles */}
      {hasGMRole && (
        <div className="flex gap-1 mb-6 bg-surface border border-border rounded-lg p-1 w-fit">
          {[
            { key: 'player' as const, label: 'Jogador' },
            { key: 'gm' as const, label: 'Mestre' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-gold-dim border border-gold/20 text-gold'
                  : 'text-saga-muted hover:text-saga-text'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── JOGADOR tab ── */}
      {tab === 'player' && (
        charMemberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User size={52} className="text-saga-muted/30 mb-4" />
            <p className="font-cinzel text-lg text-saga-muted">Nenhum personagem ainda</p>
            <p className="text-sm text-saga-muted mt-1 max-w-sm">
              Clique em &quot;+ Criar Personagem&quot; para criar sua primeira ficha.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {charMemberships.map((m, idx) => {
              const char = m.character!
              const ClassIcon = CLASS_ICONS[char.class ?? ''] ?? User
              const hpPercent = Math.round((char.hp / Math.max(1, char.maxHp)) * 100)
              const hpColor = hpPercent > 60 ? 'bg-saga-success' : hpPercent > 30 ? 'bg-saga-warning' : 'bg-saga-danger'
              const campaignGradient = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length]!
              return (
                <Link key={m.id} href={`/characters/${m.id}`}>
                  <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-bright transition-all card-hover">
                    {/* Campaign badge — topo do card */}
                    <div className={`bg-gradient-to-r ${campaignGradient} px-3 py-1.5 flex items-center gap-1.5`}>
                      <BookOpen size={10} className="text-white/70 shrink-0"/>
                      <span className="text-[10px] font-medium text-white/90 truncate">{m.campaign.name}</span>
                      {m.campaign.system && (
                        <span className="text-[9px] text-white/50 shrink-0 ml-auto">{m.campaign.system.name}</span>
                      )}
                    </div>
                    {char.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.imageUrl} alt={char.name} className="w-full h-36 object-cover object-top"/>
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-[#1a0533] via-[#4a1080] to-[#7c3aed] flex items-center justify-center text-white/40">
                        <ClassIcon size={48}/>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-cinzel font-semibold">{char.name}</h3>
                          <p className="text-[12px] text-saga-muted">{char.race ?? ''} {char.class ?? ''}</p>
                        </div>
                        <Badge variant="gold">Nv. {char.level}</Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-saga-muted mb-1">
                          <span>HP</span><span>{char.hp} / {char.maxHp}</span>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${hpColor}`} style={{ width: `${hpPercent}%` }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {/* ── MESTRE tab ── */}
      {tab === 'gm' && (
        <div className="space-y-8">
          {gmCampaigns.map(campaign => {
            const players = campaign.members
            return (
              <div key={campaign.id}>
                {/* Campaign header */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="font-cinzel text-base font-semibold">{campaign.name}</h2>
                    <p className="text-[12px] text-saga-muted mt-0.5">{campaign.npcs.length} NPC{campaign.npcs.length !== 1 ? 's' : ''} · {players.length} jogador{players.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/campaign/${campaign.id}/npcs`}
                      className="flex items-center gap-1.5 text-[12px] text-saga-muted hover:text-gold transition-colors">
                      <ExternalLink size={12}/> Ver todos
                    </Link>
                    <GMActions campaignId={campaign.id} players={players}/>
                  </div>
                </div>

                {campaign.npcs.length === 0 ? (
                  <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center text-sm text-saga-muted">
                    Nenhum NPC criado ainda. Clique em &quot;+ Criar NPC&quot; acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {campaign.npcs.map(npc => {
                      const TypeIcon = NPC_TYPE_ICONS[npc.type] ?? User
                      return (
                        <Link key={npc.id} href={`/campaign/${campaign.id}/npcs`}>
                          <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-bright transition-all card-hover">
                            {npc.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={npc.imageUrl} alt={npc.name} className="w-full h-28 object-cover"/>
                            ) : (
                              <div className="w-full h-28 bg-surface-2 flex items-center justify-center text-saga-muted/30">
                                <TypeIcon size={32}/>
                              </div>
                            )}
                            <div className="p-3">
                              <h3 className="font-cinzel text-sm font-semibold truncate">{npc.name}</h3>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Badge variant={npc.type === 'VILLAIN' ? 'gold' : npc.type === 'ALLY' ? 'success' : 'muted'}>
                                  {NPC_TYPE_LABELS[npc.type] ?? npc.type}
                                </Badge>
                                <Badge variant={npc.isPublic ? 'success' : 'muted'}>
                                  {npc.isPublic ? 'Visível' : 'Restrito'}
                                </Badge>
                              </div>
                              {npc.description && (
                                <p className="text-[11px] text-saga-dim mt-2 line-clamp-2">{npc.description}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
