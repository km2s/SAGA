'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function JoinCampaignModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!campaignId.trim()) { setError('ID da campanha obrigatório'); return }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/campaigns/${campaignId.trim()}/join`, {
      method: 'POST',
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Campanha não encontrada')
      return
    }
    setCampaignId('')
    onClose()
    router.push(`/campaign/${campaignId.trim()}`)
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Entrar em Campanha">
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft font-cormorant">
          Peça ao Mestre o ID da campanha. Você pode encontrá-lo na URL da campanha no SAGA.
        </p>
        <div>
          <label className="text-[11px] text-wax font-bold uppercase tracking-widest block mb-1.5">
            ID da Campanha
          </label>
          <input
            value={campaignId}
            onChange={e => setCampaignId(e.target.value)}
            placeholder="cm..."
            className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2.5 text-sm font-mono text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax transition-colors"
          />
        </div>
        {error && <p className="text-sm text-wax">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar na Campanha'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
