'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateCampaignModal } from './CreateCampaignModal'
import { JoinCampaignModal } from './JoinCampaignModal'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

export function DashboardActions() {
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const { t } = useLocale()

  return (
    <>
      <div className="flex gap-2 flex-wrap justify-end">
        <Link href="/explorar">
          <Button variant="secondary">
            <Compass size={14} className="mr-1.5" />
            {t.dashboard.exploreBtn}
          </Button>
        </Link>
        <Button variant="secondary" onClick={() => setJoinOpen(true)}>{t.dashboard.joinBtn}</Button>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>{t.dashboard.newBtn}</Button>
      </div>
      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinCampaignModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
