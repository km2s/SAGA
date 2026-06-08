'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const NPC_TYPES = [
  { value: 'NEUTRAL', label: 'Neutro' },
  { value: 'ALLY', label: 'Aliado' },
  { value: 'VILLAIN', label: 'Vilão' },
  { value: 'MERCHANT', label: 'Mercador' },
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'MOUNT', label: 'Montaria' },
  { value: 'SERVANT', label: 'Servo' },
  { value: 'OTHER', label: 'Outro' },
]

interface Player { id: string; user: { username: string } }

export function CreateNPCModal({ campaignId, players, open, onClose }: {
  campaignId: string
  players: Player[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', imageUrl: '', type: 'NEUTRAL',
    race: '', class: '', level: 1, hp: 10, maxHp: 10,
    isPublic: false, linkedMemberId: '',
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/npcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        linkedMemberId: form.linkedMemberId || null,
      }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao criar NPC')
      return
    }
    setForm({ name: '', description: '', imageUrl: '', type: 'NEUTRAL', race: '', class: '', level: 1, hp: 10, maxHp: 10, isPublic: false, linkedMemberId: '' })
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar NPC">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Nome + Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Malachor, o Lich..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Tipo</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors">
              {NPC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Ligado ao Jogador</label>
            <select value={form.linkedMemberId} onChange={e => set('linkedMemberId', e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors">
              <option value="">Nenhum</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.user.username}</option>)}
            </select>
          </div>
        </div>

        {/* Raça + Classe + Nível */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Raça</label>
            <input value={form.race} onChange={e => set('race', e.target.value)}
              placeholder="Humano..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Classe</label>
            <input value={form.class} onChange={e => set('class', e.target.value)}
              placeholder="Mago..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nível</label>
            <input type="number" min={1} max={30} value={form.level} onChange={e => set('level', Number(e.target.value))}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
        </div>

        {/* HP */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">HP Atual</label>
            <input type="number" min={0} value={form.hp} onChange={e => set('hp', Number(e.target.value))}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">HP Máximo</label>
            <input type="number" min={0} value={form.maxHp} onChange={e => set('maxHp', Number(e.target.value))}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Descrição</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            placeholder="Um lich ancião que domina o reino das sombras..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors resize-none" />
        </div>

        {/* Imagem */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">URL da Imagem</label>
          <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
        </div>

        {/* Visibilidade */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => set('isPublic', !form.isPublic)}
            className={`w-9 h-5 rounded-full relative transition-colors ${form.isPublic ? 'bg-saga-success' : 'bg-border-bright'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${form.isPublic ? 'right-[3px]' : 'left-[3px]'}`} />
          </div>
          <span className="text-sm">Visível para todos os jogadores</span>
        </label>

        {error && <p className="text-sm text-saga-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar NPC'}</Button>
        </div>
      </form>
    </Modal>
  )
}
