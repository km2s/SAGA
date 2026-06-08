'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Lock, Copy, Check } from 'lucide-react'

export function CharacterShareToggle({
  characterId,
  isPublic,
}: {
  characterId: string
  isPublic: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ficha/${characterId}`
    : `/ficha/${characterId}`

  async function toggle() {
    setLoading(true)
    await fetch(`/api/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !isPublic }),
    }).catch(() => null)
    setLoading(false)
    router.refresh()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-[11px] font-bold text-saga-muted uppercase tracking-widest mb-3">Portfólio</p>

      <button
        onClick={toggle}
        disabled={loading}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium transition-all ${
          isPublic
            ? 'bg-gold-dim border border-gold/20 text-gold hover:bg-gold/10'
            : 'bg-surface-2 border border-border text-saga-muted hover:text-saga-text hover:border-border-bright'
        }`}
      >
        {isPublic ? <Globe size={14} /> : <Lock size={14} />}
        <span className="flex-1 text-left">
          {isPublic ? 'Ficha pública' : 'Ficha privada'}
        </span>
        <span className="text-[10px] opacity-60">{loading ? '...' : isPublic ? 'Tornar privada' : 'Publicar'}</span>
      </button>

      {isPublic && (
        <div className="mt-2 flex items-center gap-2">
          <p className="flex-1 text-[11px] text-saga-dim font-mono truncate">/ficha/{characterId.slice(0, 12)}…</p>
          <button
            onClick={copyLink}
            className="flex items-center gap-1 text-[11px] text-saga-muted hover:text-gold transition-colors shrink-0"
          >
            {copied ? <Check size={12} className="text-saga-success" /> : <Copy size={12} />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  )
}
