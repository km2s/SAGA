'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr {
  id: string; value: number; customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}
interface TextField {
  id: string; key: string; label: string; value: string; order: number
}
interface Props {
  characterId: string; characterLevel: number; attributes: Attr[]
  textFields: TextField[]; weapons?: unknown[]; spellSlots?: unknown[]; canEdit: boolean
}

const ACCENT = '#eab308'

function saveTextField(characterId: string, key: string, label: string, value: string) {
  return fetch(`/api/characters/${characterId}/text-fields`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, label, value }),
  }).catch(() => null)
}

function patchAttr(characterId: string, attrId: string, value: number) {
  return fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }).catch(() => null)
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}30` }} />
    </div>
  )
}

function NumericAttr({ attr, characterId, canEdit, onSaved }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(attr.value))
  async function save() {
    const n = parseInt(val)
    if (!isNaN(n) && n !== attr.value) { await patchAttr(characterId, attr.id, n); onSaved() }
    setEditing(false)
  }
  if (!canEdit) return <span className="font-cinzel font-bold text-sm" style={{ color: ACCENT }}>{attr.value}</span>
  if (editing) return (
    <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') void save() }}
      className="w-12 bg-parchment/60 border border-gold/40 rounded text-center font-cinzel font-bold text-sm focus:outline-none"
      style={{ color: ACCENT }} />
  )
  return (
    <span className="font-cinzel font-bold text-sm cursor-pointer" style={{ color: ACCENT }}
      onClick={() => { setEditing(true); setVal(String(attr.value)) }}>
      {attr.value}
    </span>
  )
}

function TfField({ tfKey, label, characterId, textFields, canEdit, onRefresh, multi = false }: {
  tfKey: string; label: string; characterId: string; textFields: TextField[]
  canEdit: boolean; onRefresh: () => void; multi?: boolean
}) {
  const field = textFields.find(f => f.key === tfKey)
  async function save(v: string) { await saveTextField(characterId, tfKey, label, v); onRefresh() }
  return (
    <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-2">{label}</p>
      {canEdit
        ? multi
          ? <textarea defaultValue={field?.value ?? ''} rows={3} onBlur={e => void save(e.target.value)}
              className="w-full bg-parchment/60 border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none resize-none text-ink" />
          : <input type="text" defaultValue={field?.value ?? ''} onBlur={e => void save(e.target.value)}
              className="w-full bg-parchment/60 border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none text-ink" />
        : <p className="text-sm text-ink px-2 whitespace-pre-wrap">{field?.value || <span className="text-ink-soft italic text-xs">—</span>}</p>
      }
    </div>
  )
}

function ThresholdBar({ label, threshold, currentKey, textFields, characterId, canEdit, onRefresh, color }: {
  label: string; threshold: number; currentKey: string; textFields: TextField[]
  characterId: string; canEdit: boolean; onRefresh: () => void; color: string
}) {
  const field = textFields.find(f => f.key === currentKey)
  const current = parseInt(field?.value ?? '0') || 0
  const pct = threshold > 0 ? Math.min(100, (current / threshold) * 100) : 0

  async function adjust(delta: number) {
    if (!canEdit) return
    const next = Math.max(0, Math.min(threshold, current + delta))
    await saveTextField(characterId, currentKey, label + ' Atual', String(next))
    onRefresh()
  }

  return (
    <div className="rounded p-4" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">{label}</p>
        <div className="flex items-center gap-2">
          {canEdit && <button onClick={() => void adjust(-1)} className="w-5 h-5 text-ink-soft hover:text-ink">−</button>}
          <span className="font-cinzel font-bold text-sm" style={{ color }}>{current} / {threshold}</span>
          {canEdit && <button onClick={() => void adjust(1)} className="w-5 h-5 text-ink-soft hover:text-ink">+</button>}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--ink) / 0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      {current >= threshold && threshold > 0 && (
        <p className="text-[10px] mt-1.5" style={{ color }}>Limiar atingido!</p>
      )}
    </div>
  )
}

// ── Características tab ───────────────────────────────────────────────────────

function CaracteristicasTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const chars = attributes.filter(a => !a.attribute.description?.startsWith('Perícia') && !['Limiar', 'Threshold'].some(n => a.attribute.name.includes(n)))
  const woundThreshold = attributes.find(a => ['Ferimento Limiar', 'Wound Threshold'].some(n => a.attribute.name.includes(n)))
  const strainThreshold = attributes.find(a => ['Tensão Limiar', 'Strain Threshold'].some(n => a.attribute.name.includes(n)))

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="Características" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {chars.map(a => (
            <div key={a.id} className="flex flex-col items-center gap-1 px-3 py-3 rounded"
              style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
              <span className="font-cinzel text-[10px] uppercase text-ink-soft text-center">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>

      <SectionDivider title="Trilhas de Condição" />
      {woundThreshold && (
        <ThresholdBar label="Ferimentos" threshold={woundThreshold.value} currentKey="wounds_current"
          textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} color="#ef4444" />
      )}
      {strainThreshold && (
        <ThresholdBar label="Tensão" threshold={strainThreshold.value} currentKey="strain_current"
          textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} color="#8b5cf6" />
      )}

      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="destiny_light" label="Destino Luz" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="destiny_dark" label="Destino Trevas" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
    </div>
  )
}

// ── Perícias tab ──────────────────────────────────────────────────────────────

function PericiasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const CATS = ['Perícia Geral', 'Perícia Social', 'Perícia Combate', 'Perícia Conhecimento']
  const grouped: Record<string, Attr[]> = {}
  for (const a of attributes) {
    const desc = a.attribute.description ?? ''
    const cat = CATS.find(c => desc.startsWith(c)) ?? null
    if (!cat) continue
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat]!.push(a)
  }

  const labels: Record<string, string> = {
    'Perícia Geral': 'Perícias Gerais',
    'Perícia Social': 'Perícias Sociais',
    'Perícia Combate': 'Perícias de Combate',
    'Perícia Conhecimento': 'Conhecimentos',
  }

  return (
    <div className="space-y-5">
      {CATS.map(cat => {
        const attrs = grouped[cat] ?? []
        if (attrs.length === 0) return null
        return (
          <div key={cat}>
            <SectionDivider title={labels[cat] ?? cat} />
            <div className="space-y-1">
              {attrs.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
                  style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.04)' }}>
                  <span className="text-sm text-ink">{a.attribute.name}</span>
                  <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {Object.keys(grouped).length === 0 && <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia cadastrada.</p>}
    </div>
  )
}

// ── Combate tab ───────────────────────────────────────────────────────────────

function CombateTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const combat = attributes.filter(a => a.attribute.description?.startsWith('Perícia Combate'))
  return (
    <div className="space-y-4">
      <div>
        <SectionDivider title="Perícias de Combate" />
        <div className="space-y-1">
          {combat.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.04)' }}>
              <span className="text-sm text-ink">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="obligation_type" label="Tipo de Obrigação" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="obligation_magnitude" label="Magnitude" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="xp_current" label="XP Atual" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="xp_total" label="XP Total" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'species', label: 'Espécie', multi: false },
    { key: 'career', label: 'Carreira', multi: false },
    { key: 'specialization', label: 'Especialização', multi: false },
    { key: 'obligation_type', label: 'Tipo de Obrigação', multi: false },
    { key: 'obligation_magnitude', label: 'Magnitude da Obrigação', multi: false },
    { key: 'background', label: 'Background', multi: true },
    { key: 'xp_current', label: 'XP Atual', multi: false },
    { key: 'xp_total', label: 'XP Total', multi: false },
  ]
  return (
    <div className="space-y-3">
      {FIELDS.map(f => <TfField key={f.key} tfKey={f.key} label={f.label} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi={f.multi} />)}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'caracteristicas', label: 'Características' },
  { id: 'pericias', label: 'Perícias' },
  { id: 'combate', label: 'Combate' },
  { id: 'personagem', label: 'Personagem' },
]

export function StarWarsSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('caracteristicas')
  function refresh() { router.refresh() }

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
      <div className="flex border-b" style={{ borderColor: 'rgb(var(--ink) / 0.14)', background: 'rgb(var(--ink) / 0.05)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? ACCENT : 'rgb(var(--ink-soft))', background: isActive ? `${ACCENT}18` : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>
      <div className="p-5 sm:p-6">
        {activeTab === 'caracteristicas' && <CaracteristicasTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'        && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'combate'         && <CombateTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem'      && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
