'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StartSessionModal } from './StartSessionModal'
import { EndSessionButton } from './EndSessionButton'

export function SessionControls({ campaignId, hasActiveSession }: { campaignId: string; hasActiveSession: boolean }) {
  const [open, setOpen] = useState(false)

  if (hasActiveSession) {
    return <EndSessionButton campaignId={campaignId} />
  }

  return (
    <>
      <Button variant="success" onClick={() => setOpen(true)}>▶ Iniciar Sessão</Button>
      <StartSessionModal campaignId={campaignId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
