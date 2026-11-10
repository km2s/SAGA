'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/Select'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: unknown[]; spellSlots: unknown[]; canEdit: boolean }

const ACCENT = '#b45309'
const STAT_NAMES = ['Edge', 'Heart', 'Iron', 'Shadow', 'Wits']
const VOW_RANKS = ['Insignificante', 'Perigoso', 'Formidável', 'Extremo', 'Épico']
const VOW_PROGRESS: Record<string, number> = {
  Insignificante: 12, Perigoso: 8, Formidável: 4, Extremo: 2, Épico: 1
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}33` }} />
    </div>
  )
}

function EditableVal({ attrId, value, characterId, onSaved, large = false }: { attrId: string; value: number; characterId: string; onSaved: () => void; large?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  async function save() {
    const n = parseInt(val)
    if (isNaN(n) || n === value) { setEditing(false); return }
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: n }),
    }).catch(() => null)
    setEditing(false); onSaved()
  }
  if (editing) return (
    <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
      className={`bg-parchment/60 border border-amber-600/40 rounded text-center font-bold focus:outline-none ${large ? 'w-16 text-2xl' : 'w-12 text-base'}`} />
  )
  return (
    <span className={`cursor-pointer hover:text-amber-400 font-mono font-bold text-ink transition-colors ${large ? 'text-2xl' : 'text-base'}`}
      onClick={() => { setEditing(true); setVal(String(value)) }}>{value}</span>
  )
}

function TFField({ characterId, textFields, tfKey, label, placeholder, multiline = false, canEdit, onRefresh }: {
  characterId: string; textFields: TextField[]; tfKey: string; label: string; placeholder?: string; multiline?: boolean; canEdit: boolean; onRefresh: () => void
}) {
  const existing = textFields.find(f => f.key === tfKey)
  const [val, setVal] = useState(existing?.value ?? '')
  const [saving, setSaving] = useState(false)
  async function save(newVal: string) {
    setSaving(true)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value: newVal }),
    }).catch(() => null)
    setSaving(false); onRefresh()
  }
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-amber-500/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

function ResourceTrack({ label, value, max, color = ACCENT, onSet, canEdit }: {
  label: string; value: number; max: number; color?: string; onSet: (v: number) => void; canEdit: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-wider">
        <span>{label}</span><span>{value}/{max}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max + 1 }).map((_, i) => (
          <button key={i} type="button" onClick={() => canEdit && onSet(i)}
            className="flex-1 h-3 rounded transition-all"
            style={{ background: i <= value ? color : 'rgb(var(--ink) / 0.1)' }} />
        ))}
      </div>
    </div>
  )
}

function MomentumTrack({ value, canEdit, onSet }: { value: number; canEdit: boolean; onSet: (v: number) => void }) {
  const min = -6; const max = 10
  const normalized = value - min
  const total = max - min + 1
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-wider">
        <span>Momentum</span>
        <span className="font-bold" style={{ color: value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : 'inherit' }}>
          {value >= 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => {
          const v = i + min
          const filled = v <= value
          const bg = v === 0 ? 'rgb(var(--ink) / 0.3)' : v > 0 ? (filled ? '#22c55e' : 'rgb(var(--ink) / 0.08)') : (filled ? '#ef4444' : 'rgb(var(--ink) / 0.08)')
          return (
            <button key={i} type="button" onClick={() => canEdit && onSet(v)}
              className="flex-1 h-3 rounded transition-all relative"
              style={{ background: bg }}>
              {v === 0 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-ink-soft">0</span>}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-[9px] text-ink-soft">
        <span>-6</span><span>0</span><span>+10</span>
      </div>
    </div>
  )
}

function VowSlot({ num, characterId, textFields, canEdit, onRefresh }: { num: number; characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void }) {
  const titleKey = `vow${num}_title`
  const rankKey = `vow${num}_rank`
  const progressKey = `vow${num}_progress`

  const title = textFields.find(f => f.key === titleKey)?.value ?? ''
  const rank = textFields.find(f => f.key === rankKey)?.value ?? 'Perigoso'
  const progress = parseInt(textFields.find(f => f.key === progressKey)?.value ?? '0')

  const [localTitle, setLocalTitle] = useState(title)
  const [localRank, setLocalRank] = useState(rank)
  const [localProgress, setLocalProgress] = useState(progress)

  const ticksPerBox = VOW_PROGRESS[localRank] ?? 4
  const maxTicks = 40
  const progressPct = Math.min(localProgress / maxTicks, 1)

  async function saveTF(key: string, label: string, value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value }),
    }).catch(() => null)
    onRefresh()
  }

  async function addProgress() {
    if (!canEdit) return
    const next = Math.min(localProgress + ticksPerBox, maxTicks)
    setLocalProgress(next)
    await saveTF(progressKey, `Jura ${num} — Progresso`, String(next))
  }

  async function removeProgress() {
    if (!canEdit) return
    const next = Math.max(localProgress - ticksPerBox, 0)
    setLocalProgress(next)
    await saveTF(progressKey, `Jura ${num} — Progresso`, String(next))
  }

  const boxes = 10
  const filledBoxes = Math.floor((localProgress / maxTicks) * boxes)
  const partialTicks = Math.round(((localProgress / maxTicks) * boxes - filledBoxes) * 4)

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgb(var(--ink) / 0.08)', border: `1px solid ${ACCENT}30` }}>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-ink-soft uppercase">Jura {num}</span>
        {localRank && <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${ACCENT}20`, color: ACCENT }}>{localRank}</span>}
      </div>
      <input type="text" value={localTitle} onChange={e => setLocalTitle(e.target.value)}
        onBlur={e => void saveTF(titleKey, `Jura ${num}`, e.target.value)}
        disabled={!canEdit} placeholder="Nome da jura..."
        className="w-full bg-parchment/40 border border-ink/15 rounded px-2 py-1 text-sm text-ink-soft focus:outline-none focus:border-amber-500/50" />
      <Select size="sm" disabled={!canEdit} value={localRank}
        onChange={v => { setLocalRank(v); void saveTF(rankKey, `Jura ${num} — Dificuldade`, v) }}
        options={VOW_RANKS.map(r => ({ value: r, label: `${r} (${VOW_PROGRESS[r] ?? '?'} ticks/caixa)` }))} />
      {/* Progress Track */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-ink-soft">Progresso: {localProgress}/{maxTicks}</span>
          <div className="flex gap-1">
            <button type="button" onClick={removeProgress} disabled={!canEdit || localProgress === 0}
              className="px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-30" style={{ background: `${ACCENT}20`, color: ACCENT }}>−</button>
            <button type="button" onClick={addProgress} disabled={!canEdit || localProgress >= maxTicks}
              className="px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-30" style={{ background: ACCENT, color: '#000' }}>+</button>
          </div>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: boxes }).map((_, i) => {
            const full = i < filledBoxes
            const partial = i === filledBoxes && partialTicks > 0
            return (
              <div key={i} className="flex-1 h-4 rounded border relative overflow-hidden"
                style={{ borderColor: `${ACCENT}50`, background: full ? ACCENT : 'rgb(var(--ink) / 0.08)' }}>
                {partial && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {partialTicks === 1 && <div className="w-px h-3 bg-amber-500" />}
                    {partialTicks === 2 && <div className="text-amber-500 text-[8px] font-bold">//</div>}
                    {partialTicks === 3 && <div className="text-amber-500 text-[8px] font-bold">///</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="w-full h-1 rounded" style={{ background: 'rgb(var(--ink) / 0.1)' }}>
          <div className="h-full rounded transition-all" style={{ width: `${progressPct * 100}%`, background: ACCENT }} />
        </div>
      </div>
    </div>
  )
}

export function IronswornSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'stats' | 'juras' | 'estado' | 'personagem'>('stats')
  const onRefresh = () => router.refresh()

  const stats = attributes.filter(a => STAT_NAMES.includes(a.attribute.name))
  const momentumAttr = attributes.find(a => a.attribute.name === 'Momentum')
  const healthAttr = attributes.find(a => a.attribute.name === 'Health')
  const spiritAttr = attributes.find(a => a.attribute.name === 'Spirit')
  const supplyAttr = attributes.find(a => a.attribute.name === 'Supply')

  const [momentum, setMomentum] = useState(momentumAttr?.value ?? 2)

  async function saveMomentum(v: number) {
    if (!momentumAttr) return
    setMomentum(v)
    await fetch(`/api/characters/${characterId}/attributes/${momentumAttr.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: v }),
    }).catch(() => null)
    onRefresh()
  }

  async function saveTrack(attrId: string, v: number) {
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: v }),
    }).catch(() => null)
    onRefresh()
  }

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }
  const tabs = [
    { id: 'stats', label: 'Stats' }, { id: 'juras', label: 'Juras' },
    { id: 'estado', label: 'Estado' }, { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
        <span className="font-cinzel text-sm font-bold" style={{ color: ACCENT }}>Ironsworn</span>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgb(var(--ink) / 0.08)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: ACCENT, color: '#000' } : { color: 'rgb(var(--ink) / 0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Estatísticas" />
            <div className="grid grid-cols-5 gap-3">
              {stats.map(a => (
                <div key={a.id} className="text-center p-2 rounded-lg" style={{ background: 'rgb(var(--ink) / 0.08)' }}>
                  <div className="text-[9px] font-bold text-ink-soft uppercase mb-1">{a.attribute.name}</div>
                  <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} large />
                </div>
              ))}
            </div>
          </div>
          {momentumAttr && (
            <div className={card} style={cardStyle}>
              <MomentumTrack value={momentum} canEdit={canEdit} onSet={saveMomentum} />
            </div>
          )}
        </div>
      )}

      {tab === 'juras' && (
        <div className="space-y-3">
          <p className="text-[11px] text-ink-soft px-1">As juras são o coração do Ironsworn. Marque progresso cumprindo-as.</p>
          {[1, 2, 3, 4, 5].map(n => (
            <VowSlot key={n} num={n} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {tab === 'estado' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Recursos" />
            <div className="space-y-4">
              {healthAttr && <ResourceTrack label="Saúde" value={healthAttr.value} max={5} onSet={v => void saveTrack(healthAttr.id, v)} canEdit={canEdit} />}
              {spiritAttr && <ResourceTrack label="Espírito" value={spiritAttr.value} max={5} color="#a78bfa" onSet={v => void saveTrack(spiritAttr.id, v)} canEdit={canEdit} />}
              {supplyAttr && <ResourceTrack label="Suprimentos" value={supplyAttr.value} max={5} color="#22c55e" onSet={v => void saveTrack(supplyAttr.id, v)} canEdit={canEdit} />}
            </div>
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Condições" />
            <div className="space-y-2">
              {['wounded', 'shaken', 'unprepared', 'encumbered'].map(key => {
                const tf = textFields.find(f => f.key === `condition_${key}`)
                const checked = tf?.value === '1'
                const label = { wounded: 'Ferido', shaken: 'Abalado', unprepared: 'Despreparado', encumbered: 'Sobrecarregado' }[key]!
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={checked} disabled={!canEdit}
                      onChange={async e => {
                        await fetch(`/api/characters/${characterId}/text-fields`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ key: `condition_${key}`, label, value: e.target.checked ? '1' : '0' }),
                        }).catch(() => null)
                        onRefresh()
                      }}
                      className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm text-ink-soft">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <TFField characterId={characterId} textFields={textFields} tfKey="bonds_list" label="Vínculos (Bonds)" placeholder="Liste seus vínculos com pessoas e lugares..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="asset1" label="Asset 1" placeholder="Nome e habilidades..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="asset2" label="Asset 2" placeholder="Nome e habilidades..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="asset3" label="Asset 3" placeholder="Nome e habilidades..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="background" label="Histórico" placeholder="De onde você vem..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
