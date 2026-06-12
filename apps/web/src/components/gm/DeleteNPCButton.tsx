'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function DeleteNPCButton({ campaignId, npcId, npcName }: {
  campaignId: string
  npcId: string
  npcName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/campaigns/${campaignId}/npcs/${npcId}`, { method: 'DELETE' }).catch(() => null)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="p-1.5 rounded text-saga-muted hover:text-saga-danger hover:bg-saga-danger/10 transition-colors"
        title="Deletar NPC"
      >
        <Trash2 size={13} />
      </button>
      <ConfirmModal
        open={open}
        variant="danger"
        title={`Deletar "${npcName}"?`}
        description="Esta ação não pode ser desfeita. O NPC e todos os seus atributos serão removidos permanentemente."
        confirmLabel={loading ? 'Deletando…' : 'Deletar'}
        cancelLabel="Cancelar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
