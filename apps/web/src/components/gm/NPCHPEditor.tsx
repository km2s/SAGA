'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NPCHPEditor({ campaignId, npcId, hp, maxHp }: {
  campaignId: string
  npcId: string
  hp: number
  maxHp: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(hp))
  const [saving, setSaving] = useState(false)
  const hpPercent = Math.min(100, Math.round((hp / Math.max(1, maxHp)) * 100))
  const hpColor = hpPercent > 60 ? 'bg-saga-success' : hpPercent > 30 ? 'bg-saga-warning' : 'bg-saga-danger'
  const hpTextColor = hpPercent > 60 ? 'text-green-700' : hpPercent > 30 ? 'text-amber-600' : 'text-red-700'

  async function save() {
    const newHp = Math.min(maxHp, Math.max(0, parseInt(value) || 0))
    setSaving(true)
    await fetch(`/api/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp: newHp }),
    }).catch(() => null)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="bg-[#f5ecd6] border border-ink/20 rounded-lg p-4">
      <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest mb-3">Pontos de Vida</p>
      <div className="flex items-baseline gap-1.5 mb-3">
        {editing ? (
          <input
            type="number" min={0} max={maxHp} value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
            className={`w-20 bg-parchment/60 border border-gold/40 rounded px-2 py-1 font-cinzel text-3xl font-bold ${hpTextColor} focus:outline-none`}
          />
        ) : (
          <span className={`font-cinzel text-4xl font-bold ${hpTextColor} cursor-pointer hover:text-gold transition-colors`}
            onClick={() => setEditing(true)} title="Clique para editar">
            {hp}
          </span>
        )}
        <span className="text-ink-soft text-lg">/ {maxHp}</span>
      </div>
      <div className="h-2.5 bg-parchment/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${hpColor} transition-all`} style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-ink-soft">{hpPercent}%</span>
        {editing ? (
          <div className="flex gap-1">
            <button onClick={() => setEditing(false)} className="text-[10px] text-ink-soft hover:text-ink px-1">Cancelar</button>
            <button onClick={save} disabled={saving} className="text-[10px] text-gold hover:text-gold/80 px-1 font-medium">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-[10px] text-ink-soft hover:text-gold transition-colors">
            Editar HP
          </button>
        )}
      </div>
    </div>
  )
}
