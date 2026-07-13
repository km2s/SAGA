'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/Badge'

interface Member {
  id: string
  role: string
  user: { username: string }
  character: { name: string; level: number } | null
}

interface Props {
  campaignId: string
  members: Member[]
}

export function MembersOnlineStatus({ campaignId, members }: Props) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function heartbeat() {
      await fetch(`/api/campaigns/${campaignId}/presence`, { method: 'POST' }).catch(() => {})
    }

    async function fetchOnline() {
      const res = await fetch(`/api/campaigns/${campaignId}/presence`).catch(() => null)
      if (!res?.ok) return
      const data: { onlineIds: string[] } = await res.json().catch(() => ({ onlineIds: [] }))
      setOnlineIds(new Set(data.onlineIds))
    }

    heartbeat()
    fetchOnline()

    intervalRef.current = setInterval(() => {
      heartbeat()
      fetchOnline()
    }, 20_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [campaignId])

  return (
    <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-ink/20 text-[11px] font-bold text-ink-soft uppercase tracking-widest flex items-center justify-between">
        Jogadores
        <Badge variant="success">{members.length} membros</Badge>
      </div>
      {members.map(m => {
        const isOnline = onlineIds.has(m.id)
        return (
          <div key={m.id} className="flex items-center gap-2.5 px-4 py-3 border-b border-ink/20 last:border-0 hover:bg-parchment/60 transition-all cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-gold flex items-center justify-center text-xs font-bold shrink-0">
              {m.user.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{m.user.username}</p>
                {m.role === 'GM' && <Badge variant="gold">Mestre</Badge>}
              </div>
              <p className="text-[11px] text-ink-soft truncate">
                {m.character ? `${m.character.name} · Nv.${m.character.level}` : 'Sem personagem'}
              </p>
            </div>
            <div
              className="w-2 h-2 rounded-full shrink-0 transition-colors duration-500"
              style={{ background: isOnline ? '#22c55e' : '#4a4a6a' }}
            />
          </div>
        )
      })}
    </div>
  )
}
