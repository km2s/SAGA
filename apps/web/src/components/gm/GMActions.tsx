'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateNPCModal } from './CreateNPCModal'

interface Player { id: string; user: { username: string } }

export function GMActions({ campaignId, players }: { campaignId: string; players: Player[] }) {
  const [npcOpen, setNpcOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setNpcOpen(true)}>+ Criar NPC</Button>
      <CreateNPCModal
        campaignId={campaignId}
        players={players}
        open={npcOpen}
        onClose={() => setNpcOpen(false)}
      />
    </>
  )
}
