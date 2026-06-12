'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: unknown[]; spellSlots: unknown[]; canEdit: boolean }

const ACCENT = '#f97316'
const MAIN_ATTRS = ['Agilidade', 'Astúcia', 'Espírito', 'Força', 'Vigor']
const DIE_LABELS: Record<number, string> = { 1: 'd4', 2: 'd6', 3: 'd8', 4: 'd10', 5: 'd12', 6: 'd12+1', 7: 'd12+2' }

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}33` }} />
    </div>
  )
}

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved }: {
  value: number; max?: number; editable?: boolean; attrId?: string; characterId?: string; onSaved?: () => void
}) {
  async function handleClick(i: number) {
    if (!editable || !attrId || !characterId || !onSaved) return
    const newVal = i + 1 === value ? i : i + 1
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newVal }),
    }).catch(() => null)
    onSaved()
  }
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} type="button" onClick={() => void handleClick(i)}
          className={`w-3 h-3 rounded border transition-colors ${editable ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ background: i < value ? ACCENT : 'transparent', borderColor: ACCENT }} />
      ))}
    </div>
  )
}

function TFField({ characterId, textFields, tfKey, label, placeholder, multiline = false, type = 'text', canEdit, onRefresh }: {
  characterId: string; textFields: TextField[]; tfKey: string; label: string; placeholder?: string; multiline?: boolean; type?: string; canEdit: boolean; onRefresh: () => void
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
  const cls = 'w-full bg-surface-2/50 border border-white/10 rounded-lg text-sm text-saga-muted placeholder-saga-dim/40 focus:outline-none focus:border-orange-500/50 focus:bg-surface-2 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-saga-dim uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

export function SavageWorldsSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'pericias' | 'estado' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()

  const mainAttrs = attributes.filter(a => MAIN_ATTRS.includes(a.attribute.name))
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia'))

  const woundsCurrent = parseInt(textFields.find(f => f.key === 'wounds_current')?.value ?? '0')
  const fatigueCurrent = parseInt(textFields.find(f => f.key === 'fatigue_current')?.value ?? '0')
  const bennies = parseInt(textFields.find(f => f.key === 'bennies')?.value ?? '3')

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' }, { id: 'pericias', label: 'Perícias' },
    { id: 'estado', label: 'Estado' }, { id: 'personagem', label: 'Personagem' },
  ] as const

  async function saveTrack(key: string, label: string, value: number) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value: String(value) }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: ACCENT }}>Savage Worlds</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-saga-dim">Bennies: <span className="font-bold" style={{ color: ACCENT }}>{bennies}</span></span>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: ACCENT, color: '#000' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Atributos Principais" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {mainAttrs.map(a => {
              const die = DIE_LABELS[a.value] ?? `d${a.value * 2 + 2}`
              return (
                <div key={a.id} className="text-center p-3 rounded-lg space-y-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-[10px] font-bold text-saga-dim uppercase">{a.attribute.name}</div>
                  <div className="text-xl font-bold font-mono" style={{ color: ACCENT }}>{die}</div>
                  <Dots value={a.value} max={7} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'pericias' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Perícias" />
          <div className="space-y-1">
            {skills.map(a => {
              const die = DIE_LABELS[a.value] ?? `d${a.value * 2 + 2}`
              return (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-sm text-saga-muted">{a.attribute.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${ACCENT}20`, color: ACCENT }}>{die}</span>
                    <Dots value={a.value} max={7} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'estado' && (
        <div className="space-y-4">
          {/* Wounds */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Ferimentos" />
            <div className="flex gap-2">
              {['Ileso', 'Abalado', 'Ferimento 1', 'Ferimento 2', 'Incapacitado'].map((lbl, i) => (
                <button key={i} type="button" onClick={() => canEdit && void saveTrack('wounds_current', 'Ferimentos', i)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${i <= woundsCurrent ? 'text-white' : 'text-saga-dim'}`}
                  style={{ background: i <= woundsCurrent ? (i === 0 ? '#22c55e' : i === 1 ? '#eab308' : '#ef4444') : 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {/* Fatigue */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Fadiga" />
            <div className="flex gap-2">
              {['Normal', 'Cansado', 'Exausto'].map((lbl, i) => (
                <button key={i} type="button" onClick={() => canEdit && void saveTrack('fatigue_current', 'Fadiga', i)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${i <= fatigueCurrent ? 'text-white' : 'text-saga-dim'}`}
                  style={{ background: i <= fatigueCurrent ? (i === 0 ? '#22c55e' : i === 1 ? '#eab308' : '#ef4444') : 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {/* Bennies */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Bênçãos (Bennies)" />
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => canEdit && void saveTrack('bennies', 'Bennies', n)}
                  className="w-8 h-8 rounded-full font-bold text-sm transition-all"
                  style={{ background: n <= bennies ? ACCENT : 'rgba(0,0,0,0.4)', color: n <= bennies ? '#000' : 'rgba(255,255,255,0.3)', border: `1px solid ${n <= bennies ? ACCENT : 'rgba(255,255,255,0.1)'}` }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <TFField characterId={characterId} textFields={textFields} tfKey="race" label="Raça" placeholder="Humano, Elfo, Anão..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="edges" label="Vantagens (Edges)" placeholder="Liste suas vantagens..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="hindrances" label="Impedimentos (Hindrances)" placeholder="Liste seus impedimentos..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="powers_list" label="Poderes Arcanos" placeholder="Liste seus poderes..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="xp_current" label="XP" placeholder="0" type="number" canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
