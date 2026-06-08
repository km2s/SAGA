'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HPEditor({ characterId, hp, maxHp, canEdit }: {
  characterId: string
  hp: number
  maxHp: number
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(hp))
  const [saving, setSaving] = useState(false)
  const hpPercent = Math.min(100, Math.round((hp / maxHp) * 100))

  async function save() {
    const newHp = Math.min(maxHp, Math.max(0, parseInt(value) || 0))
    setSaving(true)
    await fetch(`/api/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp: newHp }),
    }).catch(() => null)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-[11px] font-bold text-saga-muted uppercase tracking-widest mb-3">Pontos de Vida</p>
      <div className="flex items-baseline gap-1.5 mb-3">
        {editing ? (
          <input
            type="number"
            min={0}
            max={maxHp}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
            className="w-20 bg-surface-2 border border-gold/40 rounded px-2 py-1 font-cinzel text-3xl font-bold text-saga-success focus:outline-none"
          />
        ) : (
          <span
            className={`font-cinzel text-4xl font-bold text-saga-success ${canEdit ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
            onClick={() => canEdit && setEditing(true)}
            title={canEdit ? 'Clique para editar' : undefined}
          >
            {hp}
          </span>
        )}
        <span className="text-saga-muted text-lg">/ {maxHp}</span>
      </div>
      <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-saga-success transition-all" style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-saga-muted">{hpPercent}%</span>
        {editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(false)} className="text-[10px] text-saga-muted hover:text-saga-text px-1">Cancelar</button>
            <button onClick={save} disabled={saving} className="text-[10px] text-gold hover:text-gold/80 px-1 font-medium">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
        {!editing && canEdit && (
          <button onClick={() => setEditing(true)} className="text-[10px] text-saga-muted hover:text-gold transition-colors">
            Editar HP
          </button>
        )}
      </div>
    </div>
  )
}
