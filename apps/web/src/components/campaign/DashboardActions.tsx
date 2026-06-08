'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateCampaignModal } from './CreateCampaignModal'

export function DashboardActions() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>+ Nova Campanha</Button>
      <CreateCampaignModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
