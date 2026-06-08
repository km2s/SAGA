'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function StartSessionModal({ campaignId, open, onClose }: { campaignId: string; open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/campaigns/${campaignId}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || null }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao iniciar sessão')
      return
    }
    setName('')
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Iniciar Sessão">
      <form onSubmit={handleStart} className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            Nome da Sessão (opcional)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Sessão 1, A Floresta Proibida..."
            className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors"
          />
        </div>
        {error && <p className="text-sm text-saga-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="success" type="submit" disabled={loading}>
            {loading ? 'Iniciando...' : '▶ Iniciar Sessão'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
