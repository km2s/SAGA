'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const COMMON_ATTRIBUTES = [
  { name: 'Força', die: 'd20' },
  { name: 'Destreza', die: 'd20' },
  { name: 'Constituição', die: 'd20' },
  { name: 'Inteligência', die: 'd20' },
  { name: 'Sabedoria', die: 'd20' },
  { name: 'Carisma', die: 'd20' },
]

export function AddAttributeModal({ characterId, open, onClose }: {
  characterId: string
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', value: '10', defaultDie: 'd20' })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function selectPreset(name: string, die: string) {
    setForm(f => ({ ...f, name, defaultDie: die }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    const value = parseInt(form.value)
    if (isNaN(value)) { setError('Valor inválido'); return }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), value, defaultDie: form.defaultDie }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao salvar atributo')
      return
    }
    setForm({ name: '', value: '10', defaultDie: 'd20' })
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar / Editar Atributo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] text-saga-muted font-bold uppercase tracking-widest mb-2">Atributos D&D / Tormenta</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ATTRIBUTES.map(a => (
              <button key={a.name} type="button" onClick={() => selectPreset(a.name, a.die)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  form.name === a.name
                    ? 'bg-gold-dim border-gold/40 text-gold'
                    : 'bg-surface-2 border-border text-saga-muted hover:text-saga-text'
                }`}>
                {a.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Força..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Valor (ex: 15)</label>
            <input value={form.value} onChange={e => set('value', e.target.value)} type="number" min="1" max="30"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Dado padrão</label>
            <select value={form.defaultDie} onChange={e => set('defaultDie', e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors">
              {['d4','d6','d8','d10','d12','d20','d100'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-[11px] text-saga-muted mb-1">Modificador calculado:</p>
            <p className="font-cinzel text-xl font-bold text-gold">
              {(() => { const mod = Math.floor((parseInt(form.value) - 10) / 2); return mod >= 0 ? `+${mod}` : `${mod}` })()}
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-saga-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Atributo'}</Button>
        </div>
      </form>
    </Modal>
  )
}
