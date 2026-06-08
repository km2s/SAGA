'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateCharacterModal } from './CreateCharacterModal'

interface Campaign { id: string; name: string }

export function CharactersActions({ campaigns }: { campaigns: Campaign[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>+ Criar Personagem</Button>
      <CreateCharacterModal
        campaigns={campaigns}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
