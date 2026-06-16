'use client'

import { useState } from 'react'
import { Users, Lock } from 'lucide-react'

interface Props {
  campaignId: string
  initialIsOpen: boolean
  campaignType: string
}

export function CampaignStatusToggle({ campaignId, initialIsOpen, campaignType }: Props) {
  const [isOpen, setIsOpen] = useState(initialIsOpen)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    const next = !isOpen
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: next }),
    }).catch(() => null)
    setSaving(false)
    if (res?.ok) setIsOpen(next)
  }

  const label = campaignType === 'oneshot' ? 'one-shot' : 'campanha'

  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isOpen ? 'bg-saga-success/15' : 'bg-white/5'
        }`}>
          {isOpen
            ? <Users size={15} className="text-saga-success" />
            : <Lock size={15} className="text-saga-dim" />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-saga-text">
            {isOpen ? 'Aceitando inscrições' : 'Inscrições encerradas'}
          </p>
          <p className="text-[11px] text-saga-dim mt-0.5">
            {isOpen
              ? `Esta ${label} aparece em "Explorar Campanhas" e aceita novos jogadores`
              : `Esta ${label} não aceita novas inscrições no momento`}
          </p>
        </div>
      </div>
      <button
        onClick={() => void toggle()}
        disabled={saving}
        className={`relative w-10 h-5 rounded-full transition-all shrink-0 disabled:opacity-50 ${
          isOpen ? 'bg-saga-success' : 'bg-white/10'
        }`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
          isOpen ? 'left-5' : 'left-0.5'
        }`} />
      </button>
    </div>
  )
}
