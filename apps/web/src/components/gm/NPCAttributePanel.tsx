'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Dumbbell, Zap, Heart, BookOpen, Leaf, Sparkles, Swords, X } from 'lucide-react'
import { Select } from '@/components/ui/Select'

interface Attribute {
  id: string
  value: number
  attribute: { name: string; defaultDie: string }
}

const ATTRIBUTE_ICONS: Record<string, React.ElementType> = {
  Força: Dumbbell, Destreza: Zap, Constituição: Heart,
  Inteligência: BookOpen, Sabedoria: Leaf, Carisma: Sparkles,
}
const COMMON_ATTRIBUTES = [
  { name: 'Força', die: 'd20' }, { name: 'Destreza', die: 'd20' },
  { name: 'Constituição', die: 'd20' }, { name: 'Inteligência', die: 'd20' },
  { name: 'Sabedoria', die: 'd20' }, { name: 'Carisma', die: 'd20' },
]

function getModifier(value: number) {
  const mod = Math.floor((value - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function AddNPCAttributeModal({ campaignId, npcId, open, onClose }: {
  campaignId: string; npcId: string; open: boolean; onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', value: '10', defaultDie: 'd20' })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    const value = parseInt(form.value)
    if (isNaN(value)) { setError('Valor inválido'); return }
    setError(''); setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/npcs/${npcId}/attributes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), value, defaultDie: form.defaultDie }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao salvar'); return
    }
    setForm({ name: '', value: '10', defaultDie: 'd20' })
    onClose(); router.refresh()
  }

  const mod = (() => { const m = Math.floor((parseInt(form.value) - 10) / 2); return m >= 0 ? `+${m}` : `${m}` })()

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Atributo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] text-ink-soft font-bold uppercase tracking-widest mb-2">Comuns</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ATTRIBUTES.map(a => (
              <button key={a.name} type="button" onClick={() => setForm(f => ({ ...f, name: a.name, defaultDie: a.die }))}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  form.name === a.name ? 'bg-gold/15 border-gold/40 text-gold' : 'bg-parchment/60 border-ink/20 text-ink-soft hover:text-ink'
                }`}>
                {a.name}
              </button>
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
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Valor</label>
            <input value={form.value} onChange={e => set('value', e.target.value)} type="number" min="1" max="30"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Dado</label>
            <Select value={form.defaultDie} onChange={v => set('defaultDie', v)}
              options={['d4','d6','d8','d10','d12','d20','d100'].map(d => ({ value: d, label: d }))} />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-[11px] text-ink-soft mb-1">Modificador:</p>
            <p className="font-cinzel text-xl font-bold text-gold">{mod}</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function NPCAttributePanel({ campaignId, npcId, attributes }: {
  campaignId: string
  npcId: string
  attributes: Attribute[]
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(attrId: string) {
    setDeleteTarget(null); setDeleting(attrId)
    await fetch(`/api/campaigns/${campaignId}/npcs/${npcId}/attributes`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npcAttributeId: attrId }),
    }).catch(() => null)
    setDeleting(null); router.refresh()
  }

  const targetAttr = attributes.find(a => a.id === deleteTarget)

  return (
    <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-ink/20 flex items-center justify-between">
        <h3 className="font-cinzel text-base font-semibold">Atributos</h3>
        <button onClick={() => setAddOpen(true)}
          className="px-3 py-1 rounded text-xs font-medium bg-gold/15 border border-gold/30 text-gold hover:bg-gold/20 transition-colors">
          + Adicionar
        </button>
      </div>

      {attributes.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-ink-soft">
          Nenhum atributo. Clique em &quot;+ Adicionar&quot; para registrar.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {attributes.map(attr => {
            const AttrIcon = ATTRIBUTE_ICONS[attr.attribute.name] ?? Swords
            const mod = getModifier(attr.value)
            const isPositive = !mod.startsWith('-')
            return (
              <div key={attr.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-parchment/60 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-ink/[0.06] border border-ink/20 flex items-center justify-center text-ink-soft shrink-0">
                  <AttrIcon size={18}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{attr.attribute.name}</p>
                  <p className="text-[11px] text-ink-soft">{attr.attribute.defaultDie} · valor {attr.value}</p>
                </div>
                <p className={`font-cinzel text-2xl font-bold mr-3 ${isPositive ? 'text-gold' : 'text-red-700'}`}>{mod}</p>
                <button onClick={() => setDeleteTarget(attr.id)} disabled={deleting === attr.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1 rounded text-red-700 border border-saga-danger/30 hover:bg-saga-danger/10 disabled:opacity-50">
                  {deleting === attr.id ? '...' : <X size={10}/>}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <AddNPCAttributeModal campaignId={campaignId} npcId={npcId} open={addOpen} onClose={() => setAddOpen(false)}/>
      <ConfirmModal
        open={!!deleteTarget}
        variant="warning"
        title={`Remover ${targetAttr?.attribute.name ?? 'atributo'}?`}
        description="O atributo será removido da ficha do NPC permanentemente."
        confirmLabel="Remover" cancelLabel="Cancelar"
        onConfirm={() => deleteTarget && void handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
