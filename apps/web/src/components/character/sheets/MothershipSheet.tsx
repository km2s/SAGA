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

const ACCENT = '#64748b'

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
      <div className="flex-1 h-px" style={{ background: `${ACCENT}50` }} />
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

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const saves = attributes.filter(a => {
    const d = a.attribute.description ?? ''
    return d.startsWith('Save') || d.startsWith('Salvaguarda')
  })
  const mains = attributes.filter(a => !saves.includes(a))

  const stressAttr = mains.find(a => ['Estresse', 'Stress'].some(n => a.attribute.name.includes(n)))
  const stress = stressAttr?.value ?? 0
  const MAX_STRESS = 20

  async function setStress(v: number) {
    if (!stressAttr || !canEdit) return
    await patchAttr(characterId, stressAttr.id, Math.max(0, Math.min(MAX_STRESS, v)))
    onRefresh()
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="Atributos Principais" />
        <div className="grid grid-cols-2 gap-2">
          {mains.filter(a => a !== stressAttr).map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.06)' }}>
              <span className="text-sm text-ink">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>

      {stressAttr && (
        <div className="rounded p-4" style={{ background: 'rgb(var(--ink) / 0.025)', border: `1px solid ${stress > 10 ? '#f97316' : 'rgb(var(--ink) / 0.14)'}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Estresse</p>
            <div className="flex items-center gap-2">
              {canEdit && <button onClick={() => void setStress(stress - 1)} className="w-5 h-5 text-ink-soft hover:text-ink">−</button>}
              <span className="font-cinzel font-bold" style={{ color: stress > 10 ? '#f97316' : ACCENT }}>{stress} / {MAX_STRESS}</span>
              {canEdit && <button onClick={() => void setStress(stress + 1)} className="w-5 h-5 text-ink-soft hover:text-ink">+</button>}
            </div>
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {Array.from({ length: MAX_STRESS }).map((_, i) => (
              <button key={i} onClick={() => canEdit && void setStress(i < stress ? i : i + 1)}
                disabled={!canEdit}
                className="rounded-sm border transition-all"
                style={{
                  width: 14, height: 14,
                  background: i < stress ? (stress > 10 ? '#f97316' : ACCENT) : 'transparent',
                  borderColor: i < stress ? (stress > 10 ? '#f97316' : ACCENT) : 'rgb(var(--ink) / 0.15)',
                  cursor: canEdit ? 'pointer' : 'default',
                }} />
            ))}
          </div>
          {stress > 10 && <p className="text-xs text-orange-400 mt-2">Estresse crítico — risco de pânico!</p>}
        </div>
      )}

      <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.015)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Tabela de Pânico</p>
        {[['0–2', 'Sem pânico'], ['3–5', 'Suado: −1 em todas as ações'], ['6–8', 'Fuja ou congele'], ['9–11', 'Breakdown total'], ['12+', 'Pânico máximo']].map(([range, effect]) => (
          <div key={range} className="flex gap-3 py-1 text-xs border-b last:border-0" style={{ borderColor: 'rgb(var(--ink) / 0.04)' }}>
            <span className="font-cinzel font-bold w-10 flex-shrink-0" style={{ color: ACCENT }}>{range}</span>
            <span className="text-ink-soft">{effect}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Perícias tab ──────────────────────────────────────────────────────────────

function PericiasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const skills = attributes.filter(a => ['Perícia', 'Skill'].some(p => a.attribute.description?.startsWith(p)))
  return (
    <div>
      <SectionDivider title="Perícias" />
      <div className="space-y-1">
        {skills.map(a => (
          <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
            style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.04)' }}>
            <span className="text-sm text-ink">{a.attribute.name}</span>
            <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
          </div>
        ))}
        {skills.length === 0 && <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia cadastrada.</p>}
      </div>
    </div>
  )
}

// ── Salvaguardas tab ──────────────────────────────────────────────────────────

function SalvaguardasTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const saves = attributes.filter(a => {
    const d = a.attribute.description ?? ''
    return d.startsWith('Save') || d.startsWith('Salvaguarda')
  })
  return (
    <div className="space-y-4">
      <SectionDivider title="Salvaguardas" />
      <div className="space-y-2">
        {saves.map(a => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded"
            style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
            <div>
              <p className="text-sm text-ink">{a.attribute.name}</p>
              {a.attribute.description && <p className="text-[10px] text-ink-soft mt-0.5">{a.attribute.description}</p>}
            </div>
            <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
          </div>
        ))}
        {saves.length === 0 && <p className="text-sm text-ink-soft text-center py-6">Nenhuma salvaguarda cadastrada.</p>}
      </div>
      <TfField tfKey="wounds" label="Ferimentos" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi />
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'class', label: 'Classe', multi: false },
    { key: 'class_abilities', label: 'Habilidades de Classe', multi: true },
    { key: 'equipment', label: 'Equipamento', multi: true },
    { key: 'save_notes', label: 'Notas de Salvaguarda', multi: true },
  ]
  return (
    <div className="space-y-3">
      {FIELDS.map(f => <TfField key={f.key} tfKey={f.key} label={f.label} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi={f.multi} />)}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'pericias', label: 'Perícias' },
  { id: 'salvaguardas', label: 'Salvaguardas' },
  { id: 'personagem', label: 'Personagem' },
]

export function MothershipSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('stats')
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
        {activeTab === 'stats'        && <StatsTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'     && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'salvaguardas' && <SalvaguardasTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem'   && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
