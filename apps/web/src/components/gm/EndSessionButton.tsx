'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Square } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

export function EndSessionButton({ campaignId, compact }: { campaignId: string; compact?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()
  const { t } = useLocale()

  async function handleEnd() {
    setConfirmOpen(false)
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/sessions/end`, {
        method: 'POST',
      })

      if (!res.ok) {
        setLoading(false)
        setError(t.errors.connection)
        return
      }

      const data = await res.json() as { id?: string } | null
      const sessionId = data?.id

      router.push(
        sessionId
          ? `/campaign/${campaignId}/sessions/${sessionId}`
          : `/campaign/${campaignId}/sessions`
      )
    } catch {
      setLoading(false)
      setError(t.errors.connection)
    }
  }

  const label = loading
    ? t.endSession.ending
    : <span className="flex items-center gap-1.5"><Square size={12} />{t.endSession.btnCompact}</span>

  return (
    <>
      {compact ? (
        <button
          disabled={loading}
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-saga-danger/10 text-saga-danger border border-saga-danger/40 hover:bg-saga-danger/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {label}
        </button>
      ) : (
        <Button variant="danger" disabled={loading} onClick={() => setConfirmOpen(true)}>
          {loading
            ? t.endSession.ending
            : <span className="flex items-center gap-1.5"><Square size={14} />{t.endSession.btnFull}</span>}
        </Button>
      )}

      <ConfirmModal
        open={confirmOpen}
        variant="danger"
        title={t.endSession.confirmTitle}
        description={error || t.endSession.confirmDesc}
        confirmLabel={loading ? t.endSession.ending : t.endSession.confirmBtn}
        cancelLabel={t.endSession.cancelBtn}
        onConfirm={() => { void handleEnd() }}
        onCancel={() => { setConfirmOpen(false); setError('') }}
      />
    </>
  )
}
