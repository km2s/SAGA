'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderInput } from 'lucide-react'
import { Select } from '@/components/ui/Select'

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
      <Select
        size="sm"
        className="flex-1 min-w-0"
        disabled={saving}
        value={currentFolderId ?? ''}
        onChange={v => move(v || null)}
        options={[{ value: '', label: 'Sem pasta' }, ...folders.map(f => ({ value: f.id, label: f.name }))]}
      />
    </div>
  )
}
