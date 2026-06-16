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
  const [editingHp, setEditingHp] = useState(false)
  const [editingMax, setEditingMax] = useState(false)
  const [hpVal, setHpVal] = useState(String(hp))
  const [maxVal, setMaxVal] = useState(String(maxHp))
  const [saving, setSaving] = useState(false)
  const hpPercent = maxHp > 0 ? Math.min(100, Math.round((hp / maxHp) * 100)) : 0

  async function saveHp() {
    const newHp = Math.min(maxHp, Math.max(0, parseInt(hpVal) || 0))
    setSaving(true)
    await fetch(`/api/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp: newHp }),
    }).catch(() => null)
    setSaving(false)
    setEditingHp(false)
    router.refresh()
  }

  async function saveMax() {
    const newMax = Math.max(1, parseInt(maxVal) || 1)
    setSaving(true)
    await fetch(`/api/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxHp: newMax }),
    }).catch(() => null)
    setSaving(false)
    setEditingMax(false)
    router.refresh()
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-[11px] font-bold text-saga-muted uppercase tracking-widest mb-3">Pontos de Vida</p>
      <div className="flex items-baseline gap-1.5 mb-3">
        {editingHp ? (
          <input
            type="number" min={0} max={maxHp} value={hpVal}
            onChange={e => setHpVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void saveHp(); if (e.key === 'Escape') setEditingHp(false) }}
            onBlur={() => void saveHp()}
            autoFocus
            className="w-20 bg-surface-2 border border-gold/40 rounded px-2 py-1 font-cinzel text-3xl font-bold text-saga-success focus:outline-none"
          />
        ) : (
          <span
            className={`font-cinzel text-4xl font-bold text-saga-success ${canEdit ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
            onClick={() => canEdit && setEditingHp(true)}
            title={canEdit ? 'Clique para editar HP' : undefined}
          >
            {hp}
          </span>
        )}
        <span className="text-saga-muted text-lg">/ </span>
        {canEdit && editingMax ? (
          <input
            type="number" min={1} value={maxVal}
            onChange={e => setMaxVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void saveMax(); if (e.key === 'Escape') setEditingMax(false) }}
            onBlur={() => void saveMax()}
            autoFocus
            className="w-16 bg-surface-2 border border-gold/40 rounded px-2 py-1 font-cinzel text-xl font-bold text-saga-muted focus:outline-none"
          />
        ) : (
          <span
            className={`text-saga-muted text-lg ${canEdit ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
            onClick={() => canEdit && setEditingMax(true)}
            title={canEdit ? 'Clique para editar HP máximo' : undefined}
          >
            {maxHp}
          </span>
        )}
      </div>
      <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-saga-success transition-all" style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-saga-muted">{hpPercent}%</span>
        {(editingHp || editingMax) && (
          <div className="flex gap-1">
            <button onClick={() => { setEditingHp(false); setEditingMax(false) }} className="text-[10px] text-saga-muted hover:text-saga-text px-1">Cancelar</button>
          </div>
        )}
        {!editingHp && !editingMax && canEdit && (
          <button onClick={() => setEditingHp(true)} className="text-[10px] text-saga-muted hover:text-gold transition-colors">
            Editar HP
          </button>
        )}
        {saving && <span className="text-[10px] text-saga-dim">Salvando...</span>}
      </div>
      {canEdit && !editingHp && !editingMax && (
        <p className="text-[9px] text-saga-dim/60 mt-1">Clique no número max para editar HP máximo</p>
      )}
    </div>
  )
}
