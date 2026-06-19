'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'

const NPC_TYPE_VALUES = [
  { value: 'NEUTRAL', emoji: '⚪' },
  { value: 'ALLY',    emoji: '🟢' },
  { value: 'ENEMY',   emoji: '🔴' },
  { value: 'VILLAIN', emoji: '⚫' },
  { value: 'MERCHANT',emoji: '🟡' },
  { value: 'FAMILIAR',emoji: '💜' },
  { value: 'MOUNT',   emoji: '🟤' },
  { value: 'SERVANT', emoji: '🔵' },
  { value: 'OTHER',   emoji: '⬜' },
] as const

export function CreateNPCModal({ campaignId, players: _players, open, onClose }: {
  campaignId: string
  players: { id: string; user: { username: string } }[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('NEUTRAL')
  const [maxHp, setMaxHp] = useState(10)
  const [isPublic, setIsPublic] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(t.errors.nameRequired); return }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/npcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, hp: maxHp, maxHp, isPublic }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? t.errors.createNpc)
      return
    }
    const data = await res.json() as { id: string }
    setName(''); setType('NEUTRAL'); setMaxHp(10); setIsPublic(false)
    onClose()
    router.push(`/campaign/${campaignId}/npcs/${data.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={t.createNpc.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Name */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            {t.createNpc.nameLabel} <span className="text-saga-danger">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.createNpc.namePlaceholder}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors"
          />
        </div>

        {/* Type chips */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">{t.createNpc.typeLabel}</label>
          <div className="flex flex-wrap gap-1.5">
            {NPC_TYPE_VALUES.map(npc => (
              <button
                key={npc.value}
                type="button"
                onClick={() => setType(npc.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                  type === npc.value
                    ? 'bg-gold/15 border-gold/50 text-gold'
                    : 'bg-surface-2 border-border text-saga-muted hover:border-white/20 hover:text-saga-text'
                }`}
              >
                <span>{npc.emoji}</span>
                {t.npcTypes[npc.value]}
              </button>
            ))}
          </div>
        </div>

        {/* Max HP */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createNpc.maxHpLabel}</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMaxHp(v => Math.max(1, v - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-saga-dim hover:text-red-400 hover:bg-red-400/10 border border-border transition-all text-lg"
            >−</button>
            <input
              type="number"
              min={1}
              value={maxHp}
              onChange={e => setMaxHp(Math.max(1, Number(e.target.value)))}
              className="w-20 text-center bg-surface-2 border border-border rounded px-2 py-2 text-sm font-cinzel font-bold focus:outline-none focus:border-gold/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setMaxHp(v => v + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-saga-dim hover:text-green-400 hover:bg-green-400/10 border border-border transition-all text-lg"
            >+</button>
          </div>
        </div>

        {/* Visibility toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setIsPublic(v => !v)}
            className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${isPublic ? 'bg-saga-success' : 'bg-border-bright'}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${isPublic ? 'right-[3px]' : 'left-[3px]'}`} />
          </div>
          <span className="text-sm text-saga-muted">{isPublic ? t.createNpc.visibleLabel : t.createNpc.restrictedLabel}</span>
        </label>

        <p className="text-[11px] text-saga-dim -mt-2">{t.createNpc.hint}</p>

        {error && <p className="text-sm text-saga-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t.createNpc.creating : t.createNpc.createBtn}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
