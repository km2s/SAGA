'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateCampaignModal } from './CreateCampaignModal'
import { JoinCampaignModal } from './JoinCampaignModal'

export function DashboardActions() {
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setJoinOpen(true)}>Entrar em Campanha</Button>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>+ Nova Campanha</Button>
      </div>
      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinCampaignModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
