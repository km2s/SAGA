'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const NPC_TYPES = [
  { value: 'NEUTRAL', label: 'Neutro',    emoji: '⚪' },
  { value: 'ALLY',    label: 'Aliado',    emoji: '🟢' },
  { value: 'ENEMY',   label: 'Inimigo',   emoji: '🔴' },
  { value: 'VILLAIN', label: 'Vilão',     emoji: '⚫' },
  { value: 'MERCHANT',label: 'Mercador',  emoji: '🟡' },
  { value: 'FAMILIAR',label: 'Familiar',  emoji: '💜' },
  { value: 'MOUNT',   label: 'Montaria',  emoji: '🟤' },
  { value: 'SERVANT', label: 'Servo',     emoji: '🔵' },
  { value: 'OTHER',   label: 'Outro',     emoji: '⬜' },
]

export function CreateNPCModal({ campaignId, players: _players, open, onClose }: {
  campaignId: string
  players: { id: string; user: { username: string } }[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('NEUTRAL')
  const [maxHp, setMaxHp] = useState(10)
  const [isPublic, setIsPublic] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório'); return }
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
      setError(data.error ?? 'Erro ao criar NPC')
      return
    }
    const data = await res.json() as { id: string }
    setName(''); setType('NEUTRAL'); setMaxHp(10); setIsPublic(false)
    onClose()
    router.push(`/campaign/${campaignId}/npcs/${data.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar NPC">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Name */}
        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">
            Nome <span className="text-wax">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Malachor, o Lich..."
            className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax transition-colors"
          />
        </div>

        {/* Type chips */}
        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-2">Tipo</label>
          <div className="flex flex-wrap gap-1.5">
            {NPC_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-cinzel tracking-wide border transition-all ${
                  type === t.value
                    ? 'bg-wax border-wax-deep text-parchment'
                    : 'bg-parchment/50 border-ink/20 text-ink-soft hover:border-wax hover:text-wax'
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max HP */}
        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">HP Máximo</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMaxHp(v => Math.max(1, v - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-red-400 hover:bg-red-400/10 border border-ink/20 transition-all text-lg"
            >−</button>
            <input
              type="number"
              min={1}
              value={maxHp}
              onChange={e => setMaxHp(Math.max(1, Number(e.target.value)))}
              className="w-20 text-center bg-parchment/60 border border-ink/20 rounded px-2 py-2 text-sm font-cinzel font-bold focus:outline-none focus:border-wax transition-colors"
            />
            <button
              type="button"
              onClick={() => setMaxHp(v => v + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-green-400 hover:bg-green-400/10 border border-ink/20 transition-all text-lg"
            >+</button>
          </div>
        </div>

        {/* Visibility toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setIsPublic(v => !v)}
            className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${isPublic ? 'bg-green-700' : 'bg-ink/30'}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${isPublic ? 'right-[3px]' : 'left-[3px]'}`} />
          </div>
          <span className="text-sm text-ink-soft">{isPublic ? 'Visível para todos os jogadores' : 'Restrito ao Mestre'}</span>
        </label>

        <p className="text-[11px] text-ink-soft -mt-2">
          Raça, classe, imagem e atributos podem ser configurados na ficha do NPC após a criação.
        </p>

        {error && <p className="text-sm text-wax">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar NPC'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
