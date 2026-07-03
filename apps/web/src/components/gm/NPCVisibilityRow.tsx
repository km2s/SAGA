'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ShieldAlert, UserCheck, User } from 'lucide-react'

interface Player {
  id: string
  user: { username: string }
}

interface NPCVisibilityRecord {
  memberId: string
  canView: boolean
}

interface NPC {
  id: string
  name: string
  imageUrl: string | null
  type: string
  isPublic: boolean
  linkedMember: { user: { username: string } } | null
  visibilities: NPCVisibilityRecord[]
}

const NPC_TYPE_LABELS: Record<string, string> = {
  VILLAIN: 'Vilão', ALLY: 'Aliado', MERCHANT: 'Mercador',
  FAMILIAR: 'Familiar', MOUNT: 'Montaria', SERVANT: 'Servo', NEUTRAL: 'Neutro', OTHER: 'Outro',
}

export function NPCVisibilityRow({
  npc,
  players,
  campaignId,
}: {
  npc: NPC
  players: Player[]
  campaignId: string
}) {
  const [visibilities, setVisibilities] = useState<NPCVisibilityRecord[]>(npc.visibilities)
  const [loading, setLoading] = useState<string | null>(null)

  function canPlayerView(playerId: string): boolean {
    if (npc.isPublic) return true
    const vis = visibilities.find(v => v.memberId === playerId)
    return vis?.canView ?? false
  }

  async function toggleVisibility(playerId: string) {
    if (npc.isPublic) return
    const current = canPlayerView(playerId)
    const next = !current

    setVisibilities(prev => {
      const existing = prev.find(v => v.memberId === playerId)
      if (existing) {
        return prev.map(v => v.memberId === playerId ? { ...v, canView: next } : v)
      }
      return [...prev, { memberId: playerId, canView: next }]
    })

    setLoading(playerId)

    const res = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: playerId, canView: next }),
    }).catch(() => null)

    if (!res || !res.ok) {
      setVisibilities(prev => {
        const existing = prev.find(v => v.memberId === playerId)
        if (existing) {
          return prev.map(v => v.memberId === playerId ? { ...v, canView: current } : v)
        }
        return [...prev, { memberId: playerId, canView: current }]
      })
    }

    setLoading(null)
  }

  return (
    <div className="flex items-center justify-between bg-[#f5ecd6] border border-ink/20 rounded-lg px-4 py-3 hover:border-wax transition-all">
      <div className="flex items-center gap-3">
        {npc.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={npc.imageUrl} alt={npc.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-parchment/60 border border-ink/20 flex items-center justify-center shrink-0 text-ink-soft">
            {npc.type === 'VILLAIN' ? <ShieldAlert size={15} /> : npc.type === 'ALLY' ? <UserCheck size={15} /> : <User size={15} />}
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm">{npc.name}</p>
            <Badge variant="purple">{NPC_TYPE_LABELS[npc.type] ?? npc.type}</Badge>
          </div>
          {npc.linkedMember && (
            <p className="text-[11px] text-ink-soft">Ligado a {npc.linkedMember.user.username}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant={npc.isPublic ? 'success' : 'muted'}>
          {npc.isPublic ? 'Público' : 'Restrito'}
        </Badge>

        <div className="flex items-center gap-3">
          {players.map(player => {
            const visible = canPlayerView(player.id)
            const isLoading = loading === player.id

            return (
              <button
                key={player.id}
                onClick={() => { void toggleVisibility(player.id) }}
                disabled={npc.isPublic || isLoading}
                title={`${player.user.username}: ${visible ? 'pode ver' : 'não pode ver'} — clique para alternar`}
                className={`flex flex-col items-center gap-1 group disabled:cursor-not-allowed transition-all ${isLoading ? 'opacity-50' : ''}`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all
                    ${visible
                      ? 'bg-saga-success border-bg text-white'
                      : 'bg-parchment/60 border-bg text-ink-soft group-hover:border-wax'
                    }
                    ${npc.isPublic ? '' : 'cursor-pointer'}`}
                >
                  {player.user.username[0]?.toUpperCase()}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
