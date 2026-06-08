'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function EndSessionButton({ campaignId, compact }: { campaignId: string; compact?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

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
        setError('Erro ao encerrar sessão. Tente novamente.')
        return
      }

      const data = await res.json() as { id?: string } | null
      const sessionId = data?.id

      if (sessionId) {
        // Redirect to session summary so GM can write the recap
        router.push(`/campaign/${campaignId}/sessions/${sessionId}`)
      } else {
        setLoading(false)
        setError('Erro inesperado. Tente novamente.')
      }
    } catch (err) {
      setLoading(false)
      setError('Erro de conexão. Verifique sua conexão e tente novamente.')
    }
  }

  const label = loading ? 'Encerrando...' : '⏹ Encerrar'

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
          {loading ? 'Encerrando...' : '⏹ Encerrar Sessão'}
        </Button>
      )}

      <ConfirmModal
        open={confirmOpen}
        variant="danger"
        title="Encerrar sessão?"
        description={error || "Todos os jogadores perderão acesso à mesa. Você poderá escrever o resumo da sessão em seguida."}
        confirmLabel={loading ? 'Encerrando...' : '⏹ Encerrar e ir ao resumo'}
        cancelLabel="Continuar jogando"
        onConfirm={() => { void handleEnd() }}
        onCancel={() => { setConfirmOpen(false); setError('') }}
      />
    </>
  )
}
