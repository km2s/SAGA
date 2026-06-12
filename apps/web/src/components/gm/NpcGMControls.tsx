'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

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

interface NpcData {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  type: string
  race: string | null
  class: string | null
  level: number
  isPublic: boolean
  linkedMemberId: string | null
}

export function NpcGMControls({ campaignId, npc, players }: {
  campaignId: string
  npc: NpcData
  players: Player[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [form, setForm] = useState({
    name: npc.name,
    description: npc.description ?? '',
    imageUrl: npc.imageUrl ?? '',
    type: npc.type,
    race: npc.race ?? '',
    class: npc.class ?? '',
    level: npc.level,
    isPublic: npc.isPublic,
    linkedMemberId: npc.linkedMemberId ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleDelete() {
    setDeleteLoading(true)
    await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, { method: 'DELETE' }).catch(() => null)
    setDeleteLoading(false)
    setDeleteOpen(false)
    router.push(`/campaign/${campaignId}/npcs`)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setEditError('Nome obrigatório'); return }
    setEditError('')
    setEditLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        type: form.type,
        race: form.race || null,
        class: form.class || null,
        level: form.level,
        isPublic: form.isPublic,
        linkedMemberId: form.linkedMemberId || null,
      }),
    }).catch(() => null)
    setEditLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setEditError(data.error ?? 'Erro ao salvar NPC')
      return
    }
    setEditOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-saga-text border border-border hover:border-border-bright transition-colors"
      >
        <Pencil size={13} />
        Editar NPC
      </button>
      <button
        onClick={() => setDeleteOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-saga-danger border border-saga-danger/30 hover:bg-saga-danger/10 transition-colors"
      >
        <Trash2 size={13} />
        Deletar
      </button>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Editar — ${npc.name}`}>
        <form onSubmit={handleEdit} className="flex flex-col gap-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Raça</label>
              <input value={form.race} onChange={e => set('race', e.target.value)}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Classe</label>
              <input value={form.class} onChange={e => set('class', e.target.value)}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nível</label>
              <input type="number" min={1} max={30} value={form.level} onChange={e => set('level', Number(e.target.value))}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Descrição</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors resize-none" />
          </div>

          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">URL da Imagem</label>
            <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60 transition-colors" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set('isPublic', !form.isPublic)}
              className={`w-9 h-5 rounded-full relative transition-colors ${form.isPublic ? 'bg-saga-success' : 'bg-border-bright'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${form.isPublic ? 'right-[3px]' : 'left-[3px]'}`} />
            </div>
            <span className="text-sm">Visível para todos os jogadores</span>
          </label>

          {editError && <p className="text-sm text-saga-danger">{editError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={editLoading}>
              {editLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        variant="danger"
        title={`Deletar "${npc.name}"?`}
        description="Esta ação não pode ser desfeita. O NPC e todos os seus atributos serão removidos permanentemente."
        confirmLabel={deleteLoading ? 'Deletando…' : 'Deletar'}
        cancelLabel="Cancelar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
