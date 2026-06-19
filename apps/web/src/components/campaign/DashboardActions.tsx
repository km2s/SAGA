'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateCampaignModal } from './CreateCampaignModal'
import { JoinCampaignModal } from './JoinCampaignModal'
import Link from 'next/link'
import { Compass } from 'lucide-react'

export function DashboardActions() {
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2 flex-wrap justify-end">
        <Link href="/explorar">
          <Button variant="secondary">
            <Compass size={14} className="mr-1.5" />
            Explorar
          </Button>
        </Link>
        <Button variant="secondary" onClick={() => setJoinOpen(true)}>Entrar em Campanha</Button>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>+ Nova Campanha</Button>
      </div>
      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinCampaignModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
