'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StartSessionModal } from './StartSessionModal'
import { EndSessionButton } from './EndSessionButton'
import { Play } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

export function SessionControls({ campaignId, hasActiveSession }: { campaignId: string; hasActiveSession: boolean }) {
  const [open, setOpen] = useState(false)
  const { t } = useLocale()

  if (hasActiveSession) {
    return <EndSessionButton campaignId={campaignId} />
  }

  return (
    <>
      <Button variant="success" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-1.5"><Play size={13} />{t.gmPanel.startSession}</span>
      </Button>
      <StartSessionModal campaignId={campaignId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
