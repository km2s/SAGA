'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateNoteModal } from './CreateNoteModal'

interface Props {
  campaignId: string
  isGM: boolean
}

export function NotesActions({ campaignId, isGM }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>+ Nova Nota</Button>
      <CreateNoteModal open={open} onClose={() => setOpen(false)} campaignId={campaignId} isGM={isGM} />
    </>
  )
}
