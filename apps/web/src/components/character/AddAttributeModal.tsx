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

const DND5E_SKILLS = [
  { name: 'Atletismo',        attr: 'FOR', desc: 'Perícia (FOR)' },
  { name: 'Acrobacia',        attr: 'DES', desc: 'Perícia (DES)' },
  { name: 'Furtividade',      attr: 'DES', desc: 'Perícia (DES)' },
  { name: 'Prestidigitação',  attr: 'DES', desc: 'Perícia (DES)' },
  { name: 'Arcanismo',        attr: 'INT', desc: 'Perícia (INT)' },
  { name: 'História',         attr: 'INT', desc: 'Perícia (INT)' },
  { name: 'Investigação',     attr: 'INT', desc: 'Perícia (INT)' },
  { name: 'Natureza',         attr: 'INT', desc: 'Perícia (INT)' },
  { name: 'Religião',         attr: 'INT', desc: 'Perícia (INT)' },
  { name: 'Adestrar Animais', attr: 'SAB', desc: 'Perícia (SAB)' },
  { name: 'Intuição',         attr: 'SAB', desc: 'Perícia (SAB)' },
  { name: 'Medicina',         attr: 'SAB', desc: 'Perícia (SAB)' },
  { name: 'Percepção',        attr: 'SAB', desc: 'Perícia (SAB)' },
  { name: 'Sobrevivência',    attr: 'SAB', desc: 'Perícia (SAB)' },
  { name: 'Enganação',        attr: 'CAR', desc: 'Perícia (CAR)' },
  { name: 'Intimidação',      attr: 'CAR', desc: 'Perícia (CAR)' },
  { name: 'Atuação',          attr: 'CAR', desc: 'Perícia (CAR)' },
  { name: 'Persuasão',        attr: 'CAR', desc: 'Perícia (CAR)' },
]

const ATTR_COLORS: Record<string, string> = {
  FOR: '#ef4444', DES: '#22c55e', CON: '#f97316',
  INT: '#3b82f6', SAB: '#8b5cf6', CAR: '#ec4899',
}

export function AddAttributeModal({ characterId, open, onClose }: {
  characterId: string
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', value: '10', defaultDie: 'd20', description: '' })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function selectPreset(name: string, die: string, description = '') {
    setForm(f => ({ ...f, name, defaultDie: die, description }))
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
      body: JSON.stringify({
        name: form.name.trim(),
        value,
        defaultDie: form.defaultDie,
        ...(form.description && { description: form.description }),
      }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao salvar atributo')
      return
    }
    setForm({ name: '', value: '10', defaultDie: 'd20', description: '' })
    onClose()
    router.refresh()
  }

  const byAttr = DND5E_SKILLS.reduce<Record<string, typeof DND5E_SKILLS>>((acc, s) => {
    if (!acc[s.attr]) acc[s.attr] = []
    acc[s.attr]!.push(s)
    return acc
  }, {})

  return (
    <Modal open={open} onClose={onClose} title="Adicionar / Editar Atributo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] text-ink-soft font-bold uppercase tracking-widest mb-2">Atributos D&D / Tormenta</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ATTRIBUTES.map(a => (
              <button key={a.name} type="button" onClick={() => selectPreset(a.name, a.die)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  form.name === a.name && !form.description
                    ? 'bg-gold/15 border-gold/40 text-gold'
                    : 'bg-parchment/60 border-ink/20 text-ink-soft hover:text-ink'
                }`}>
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-ink-soft font-bold uppercase tracking-widest mb-2">Perícias D&D 5e</p>
          <div className="space-y-1.5">
            {Object.entries(byAttr).map(([attr, skills]) => (
              <div key={attr} className="flex items-start gap-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                  style={{ background: `${ATTR_COLORS[attr]}18`, color: ATTR_COLORS[attr], border: `1px solid ${ATTR_COLORS[attr]}30` }}>
                  {attr}
                </span>
                <div className="flex flex-wrap gap-1">
                  {skills.map(s => (
                    <button key={s.name} type="button" onClick={() => selectPreset(s.name, 'd20', s.desc)}
                      className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                        form.name === s.name && form.description === s.desc
                          ? 'border-[#8b5cf6]/50 text-[#c4b5fd]'
                          : 'bg-parchment/60 border-ink/20 text-ink-soft hover:text-ink'
                      }`}
                      style={form.name === s.name && form.description === s.desc
                        ? { background: `${ATTR_COLORS[attr]}15` } : {}}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Força..."
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Valor (ex: 15)</label>
            <input value={form.value} onChange={e => set('value', e.target.value)} type="number" min="1" max="30"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Dado padrão</label>
            <select value={form.defaultDie} onChange={e => set('defaultDie', e.target.value)}
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax transition-colors">
              {['d4','d6','d8','d10','d12','d20','d100'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-[11px] text-ink-soft mb-1">Modificador calculado:</p>
            <p className="font-cinzel text-xl font-bold text-gold">
              {(() => { const mod = Math.floor((parseInt(form.value) - 10) / 2); return mod >= 0 ? `+${mod}` : `${mod}` })()}
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Atributo'}</Button>
        </div>
      </form>
    </Modal>
  )
}
