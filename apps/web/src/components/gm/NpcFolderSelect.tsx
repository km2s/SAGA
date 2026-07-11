'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderInput } from 'lucide-react'

export function NpcFolderSelect({ campaignId, npcId, folders, currentFolderId }: {
  campaignId: string
  npcId: string
  folders: { id: string; name: string }[]
  currentFolderId: string | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function move(folderId: string | null) {
    setSaving(true)
    await fetch(`/api/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    }).catch(() => null)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5 px-3 pb-3 -mt-1" onClick={e => { e.preventDefault(); e.stopPropagation() }}>
      <FolderInput size={12} className="text-ink-soft/60 shrink-0" />
      <select
        value={currentFolderId ?? ''}
        disabled={saving}
        onChange={e => move(e.target.value || null)}
        className="flex-1 min-w-0 text-[11px] bg-parchment/60 border border-ink/20 rounded px-1.5 py-1 text-ink-soft focus:outline-none focus:border-wax"
        title="Mover para pasta"
      >
        <option value="">Sem pasta</option>
        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </div>
  )
}
