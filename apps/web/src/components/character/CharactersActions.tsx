'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateCharacterModal } from './CreateCharacterModal'
import { ImportCharacterModal } from './ImportCharacterModal'
import { Upload } from 'lucide-react'

interface Campaign { id: string; name: string; system: { id: string; name: string; category: string } | null }

export function CharactersActions({ campaigns }: { campaigns: Campaign[] }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-saga-muted hover:text-saga-text hover:border-border-bright transition-all"
        >
          <Upload size={12} /> Importar Ficha
        </button>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>+ Criar Personagem</Button>
      </div>

      <CreateCharacterModal
        campaigns={campaigns}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ImportCharacterModal
        campaigns={campaigns}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </>
  )
}
