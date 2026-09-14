'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { trackBarColor, type ResourceTrack, type ResourceValue } from '@/lib/resource-tracks'

/**
 * Card de uma barra de recurso (Pontos de Vida, Pontos de Esforço, Sanidade...).
 * Clique no número atual ou no máximo para digitar; os botões −/+ ajustam o
 * atual de 1 em 1. Sem `onSave` (ou sem permissão) o card é só leitura.
 */
export function ResourceTrackCard({ track, value, canEdit, onSave }: {
  track: ResourceTrack
  value: ResourceValue
  canEdit: boolean
  onSave?: (next: ResourceValue) => Promise<void>
}) {
  const [cur, setCur] = useState(value)
  const [editing, setEditing] = useState<'current' | 'max' | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  // Acompanha o valor vindo do servidor depois de um refresh
  useEffect(() => { setCur(value) }, [value.current, value.max]) // eslint-disable-line react-hooks/exhaustive-deps

  const editable = canEdit && !!onSave
  const pct = cur.max > 0 ? Math.min(100, Math.round((cur.current / cur.max) * 100)) : 0
  const color = trackBarColor(track, pct)

  async function commit(next: ResourceValue) {
    const max = Math.max(0, next.max)
    const fixed = { max, current: Math.min(Math.max(0, next.current), max) }
    if (fixed.current === cur.current && fixed.max === cur.max) return
    setCur(fixed)
    setSaving(true)
    await onSave?.(fixed)
    setSaving(false)
  }

  function startEdit(field: 'current' | 'max') {
    if (!editable) return
    setDraft(String(cur[field]))
    setEditing(field)
  }

  function finishEdit() {
    const n = parseInt(draft, 10)
    if (editing && !isNaN(n)) {
      void commit(editing === 'current' ? { ...cur, current: n } : { current: cur.current, max: n })
    }
    setEditing(null)
  }

  const inputCls = 'bg-parchment/60 border border-gold/40 rounded px-2 py-1 font-cinzel font-bold focus:outline-none'

  return (
    <div className="bg-card border border-ink/20 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest truncate">{track.label}</p>
        {saving && <span className="text-[10px] text-ink-soft shrink-0">Salvando...</span>}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-1.5 min-w-0">
          {editing === 'current' ? (
            <input
              type="number" min={0} max={cur.max} value={draft} autoFocus
              onChange={e => setDraft(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={e => { if (e.key === 'Enter') finishEdit(); if (e.key === 'Escape') setEditing(null) }}
              className={`w-20 text-3xl ${inputCls}`}
              style={{ color }}
            />
          ) : (
            <span
              className={`font-cinzel text-4xl font-bold leading-none ${editable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
              style={{ color }}
              onClick={() => startEdit('current')}
              title={editable ? `Clique para editar ${track.label}` : undefined}
            >
              {cur.current}
            </span>
          )}
          <span className="text-ink-soft text-lg">/</span>
          {editing === 'max' ? (
            <input
              type="number" min={0} value={draft} autoFocus
              onChange={e => setDraft(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={e => { if (e.key === 'Enter') finishEdit(); if (e.key === 'Escape') setEditing(null) }}
              className={`w-16 text-lg text-ink-soft ${inputCls}`}
            />
          ) : (
            <span
              className={`text-ink-soft text-lg ${editable ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
              onClick={() => startEdit('max')}
              title={editable ? 'Clique para editar o máximo' : undefined}
            >
              {cur.max}
            </span>
          )}
        </div>

        {editable && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button" aria-label={`Diminuir ${track.label}`}
              onClick={() => void commit({ ...cur, current: cur.current - 1 })}
              className="w-8 h-8 rounded-full border border-ink/20 flex items-center justify-center text-ink-soft hover:text-red-700 hover:border-red-700/40 transition-colors"
            >
              <Minus size={13} />
            </button>
            <button
              type="button" aria-label={`Aumentar ${track.label}`}
              onClick={() => void commit({ ...cur, current: cur.current + 1 })}
              className="w-8 h-8 rounded-full border border-ink/20 flex items-center justify-center text-ink-soft hover:text-green-700 hover:border-green-700/40 transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="h-2.5 bg-parchment/60 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-[10px] text-ink-soft mt-1">
        {cur.max === 0 && editable ? 'Clique no máximo para definir' : `${pct}%`}
      </p>
    </div>
  )
}
