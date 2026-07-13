'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react'

export function NpcFolderControls({ campaignId, folders }: {
  campaignId: string
  folders: { id: string; name: string; count: number }[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function create() {
    const name = newName.trim()
    if (!name) { setCreating(false); return }
    setBusy(true)
    await fetch(`/api/campaigns/${campaignId}/npc-folders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }).catch(() => null)
    setBusy(false); setNewName(''); setCreating(false); router.refresh()
  }

  async function rename(id: string) {
    const name = editName.trim()
    if (!name) { setEditingId(null); return }
    setBusy(true)
    await fetch(`/api/campaigns/${campaignId}/npc-folders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    }).catch(() => null)
    setBusy(false); setEditingId(null); router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('Deletar esta pasta? Os NPCs dela ficam sem pasta (não são apagados).')) return
    setBusy(true)
    await fetch(`/api/campaigns/${campaignId}/npc-folders/${id}`, { method: 'DELETE' }).catch(() => null)
    setBusy(false); router.refresh()
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {folders.map(f => (
        <span key={f.id} className="group inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-card px-3 py-1 text-xs">
          {editingId === f.id ? (
            <>
              <input
                autoFocus value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') rename(f.id); if (e.key === 'Escape') setEditingId(null) }}
                className="w-24 bg-parchment/60 border border-wax/40 rounded px-1 text-xs focus:outline-none"
              />
              <button onClick={() => rename(f.id)} disabled={busy} className="text-green-700" title="Salvar"><Check size={12} /></button>
              <button onClick={() => setEditingId(null)} className="text-ink-soft" title="Cancelar"><X size={12} /></button>
            </>
          ) : (
            <>
              <span className="font-cinzel text-ink">{f.name}</span>
              <span className="text-ink-soft/60">{f.count}</span>
              <button onClick={() => { setEditingId(f.id); setEditName(f.name) }} className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-wax transition-opacity" title="Renomear"><Pencil size={11} /></button>
              <button onClick={() => remove(f.id)} className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-red-700 transition-opacity" title="Deletar pasta"><Trash2 size={11} /></button>
            </>
          )}
        </span>
      ))}

      {creating ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-wax/40 bg-card px-3 py-1 text-xs">
          <input
            autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Nome da pasta"
            className="w-28 bg-parchment/60 border border-wax/40 rounded px-1 text-xs focus:outline-none"
          />
          <button onClick={create} disabled={busy} className="text-green-700" title="Criar"><Check size={12} /></button>
          <button onClick={() => setCreating(false)} className="text-ink-soft" title="Cancelar"><X size={12} /></button>
        </span>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-wax/50 px-3 py-1 text-xs font-cinzel text-wax hover:bg-wax/10 transition-colors"
        >
          <FolderPlus size={12} /> Nova pasta
        </button>
      )}
    </div>
  )
}
