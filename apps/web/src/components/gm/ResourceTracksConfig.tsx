'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import {
  HP_TRACK_KEY, MAX_TRACKS, TRACK_COLORS, TRACK_PRESETS, trackKeyFromLabel,
  type ResourceTrack, type TrackColor,
} from '@/lib/resource-tracks'

/**
 * Mestre escolhe quais barras aparecem nas fichas e NPCs da campanha: só Vida,
 * só PE, as duas, ou barras próprias. A chave de cada barra é fixada quando ela
 * é criada, então renomear não perde os valores já gravados nas fichas.
 */
export function ResourceTracksConfig({ campaignId, initialTracks }: {
  campaignId: string
  initialTracks: ResourceTrack[]
}) {
  const router = useRouter()
  const [tracks, setTracks] = useState(initialTracks)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const dirty = JSON.stringify(tracks) !== JSON.stringify(initialTracks)
  const taken = new Set(tracks.map(t => t.key))
  const presetsLeft = TRACK_PRESETS.filter(p => !taken.has(p.key))
  const full = tracks.length >= MAX_TRACKS

  function update(i: number, patch: Partial<ResourceTrack>) {
    setTracks(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))
    setSaved(false)
  }

  function move(i: number, dir: -1 | 1) {
    setTracks(ts => {
      const next = [...ts]
      const j = i + dir
      if (j < 0 || j >= next.length) return ts
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
    setSaved(false)
  }

  function add(track: ResourceTrack) {
    if (full) return
    setTracks(ts => [...ts, track])
    setSaved(false)
  }

  function addCustom() {
    add({ key: trackKeyFromLabel('Nova barra', taken), label: 'Nova barra', color: 'neutro' })
  }

  async function save() {
    if (tracks.some(t => !t.label.trim())) { setError('Toda barra precisa de um nome.'); return }
    setError('')
    setSaving(true)
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceTracks: tracks }),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao salvar as barras')
      return
    }
    setSaved(true)
    router.refresh()
  }

  const colorOptions = (Object.keys(TRACK_COLORS) as TrackColor[]).map(c => ({ value: c, label: TRACK_COLORS[c].label }))
  const inputCls = 'bg-parchment/60 border border-ink/20 rounded px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-gold/50 transition-colors'

  return (
    <div className="bg-card border border-ink/20 rounded-lg p-4 space-y-4">
      {tracks.length === 0 ? (
        <p className="text-[12px] text-ink-soft text-center py-3">
          Nenhuma barra — fichas e NPCs não vão mostrar vida nem outros recursos.
        </p>
      ) : (
        <div className="space-y-2">
          {tracks.map((t, i) => (
            <div key={t.key} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: TRACK_COLORS[t.color].hex }} />
              <input
                value={t.label}
                onChange={e => update(i, { label: e.target.value.slice(0, 30) })}
                placeholder="Nome da barra"
                aria-label="Nome da barra"
                className={`flex-1 min-w-[140px] ${inputCls}`}
              />
              <Select size="sm" className="w-44" value={t.color}
                onChange={v => update(i, { color: v as TrackColor })} options={colorOptions} />
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"
                  className="w-8 h-8 rounded flex items-center justify-center text-ink-soft hover:text-ink disabled:opacity-30">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === tracks.length - 1} aria-label="Descer"
                  className="w-8 h-8 rounded flex items-center justify-center text-ink-soft hover:text-ink disabled:opacity-30">
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => { setTracks(ts => ts.filter((_, j) => j !== i)); setSaved(false) }}
                  aria-label={`Remover ${t.label}`}
                  className="w-8 h-8 rounded flex items-center justify-center text-ink-soft hover:text-red-700">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {presetsLeft.map(p => (
          <button key={p.key} type="button" onClick={() => add(p)} disabled={full}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-ink/20 text-ink-soft hover:border-wax hover:text-wax disabled:opacity-40 transition-all">
            <Plus size={11} /> {p.label}
          </button>
        ))}
        <button type="button" onClick={addCustom} disabled={full}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-dashed border-ink/30 text-ink-soft hover:border-wax hover:text-wax disabled:opacity-40 transition-all">
          <Plus size={11} /> Barra personalizada
        </button>
      </div>

      <div className="text-[11px] text-ink-soft space-y-1">
        {!taken.has(HP_TRACK_KEY) && (
          <p>Sem Pontos de Vida, os tokens e a iniciativa da mesa deixam de mostrar a barra de vida.</p>
        )}
        <p>Remover uma barra não apaga os valores já gravados nas fichas — se ela voltar, os números voltam junto.</p>
        {full && <p>Máximo de {MAX_TRACKS} barras por campanha.</p>}
      </div>

      {error && <p className="text-sm text-wax">{error}</p>}

      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving || !dirty}
          className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm disabled:opacity-50 transition-all ${
            saved && !dirty ? 'bg-saga-success/15 text-green-700' : 'bg-gradient-gold text-ink'
          }`}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved && !dirty ? <Check size={14} /> : null}
          {saving ? 'Salvando...' : saved && !dirty ? 'Salvo!' : 'Salvar barras'}
        </button>
      </div>
    </div>
  )
}
