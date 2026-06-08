'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function DeleteCharacterButton({ characterId, characterName }: {
  characterId: string
  characterName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/characters/${characterId}`, { method: 'DELETE' }).catch(() => null)
    setLoading(false)
    setOpen(false)
    router.push('/characters')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-saga-danger border border-saga-danger/30 hover:bg-saga-danger/10 transition-colors"
      >
        <Trash2 size={13} />
        Deletar Ficha
      </button>
      <ConfirmModal
        open={open}
        variant="danger"
        title={`Deletar "${characterName}"?`}
        description="Esta ação não pode ser desfeita. O personagem e todos os seus atributos serão removidos permanentemente."
        confirmLabel={loading ? 'Deletando…' : 'Deletar'}
        cancelLabel="Cancelar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
