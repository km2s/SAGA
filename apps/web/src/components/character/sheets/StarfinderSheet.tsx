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

const ACCENT = '#3b82f6'

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
    <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.05)' }}>
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

function ProgressBar({ current, max, color = ACCENT, label }: { current: number; max: number; color?: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-ink-soft">{label}</span>
        <span className="font-cinzel text-xs font-bold" style={{ color }}>{current} / {max}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(51,41,29,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Atributos tab ─────────────────────────────────────────────────────────────

function AtributosTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const mains = attributes.filter(a => !a.attribute.description?.startsWith('Salvaguarda') && !a.attribute.description?.startsWith('Perícia') && !a.attribute.description?.startsWith('Combate'))
  const saves = attributes.filter(a => a.attribute.description?.startsWith('Salvaguarda'))
  const combat = attributes.filter(a => a.attribute.description?.startsWith('Combate'))

  const hp = combat.find(a => ['HP', 'Pontos de Vida'].some(n => a.attribute.name.includes(n)))
  const sp = combat.find(a => ['Vigor', 'SP', 'Stamina'].some(n => a.attribute.name.includes(n)))
  const rp = mains.find(a => ['Resolve', 'Resolução'].some(n => a.attribute.name.includes(n)))

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="Atributos Principais" />
        <div className="grid grid-cols-3 gap-2">
          {mains.filter(a => a !== rp).map(a => (
            <div key={a.id} className="flex flex-col items-center gap-1 px-3 py-3 rounded"
              style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
              <span className="font-cinzel text-[10px] uppercase text-ink-soft text-center">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>

      {(hp || sp || rp) && (
        <div className="space-y-3">
          <SectionDivider title="Recursos" />
          {hp && <ProgressBar current={hp.value} max={hp.value} color={ACCENT} label="Pontos de Vida (HP)" />}
          {sp && <ProgressBar current={sp.value} max={sp.value} color="#8b5cf6" label="Pontos de Vigor (SP)" />}
          {rp && (
            <div className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
              <span className="text-sm text-ink">Pontos de Resolução</span>
              <NumericAttr attr={rp} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          )}
        </div>
      )}

      {saves.length > 0 && (
        <div>
          <SectionDivider title="Salvaguardas" />
          <div className="space-y-1">
            {saves.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.05)' }}>
                <span className="text-sm text-ink">{a.attribute.name}</span>
                <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Perícias tab ──────────────────────────────────────────────────────────────

function PericiasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia'))
  return (
    <div>
      <SectionDivider title="Perícias" />
      <div className="space-y-1">
        {skills.map(a => (
          <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
            style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.04)' }}>
            <span className="text-sm text-ink">{a.attribute.name}</span>
            <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
          </div>
        ))}
        {skills.length === 0 && <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia cadastrada.</p>}
      </div>
    </div>
  )
}

// ── Combate tab ───────────────────────────────────────────────────────────────

function CombateTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const combat = attributes.filter(a => a.attribute.description?.startsWith('Combate'))
  const eac = combat.find(a => a.attribute.name.toUpperCase().includes('EAC'))
  const kac = combat.find(a => a.attribute.name.toUpperCase().includes('KAC'))

  return (
    <div className="space-y-5">
      {(eac || kac) && (
        <div className="grid grid-cols-2 gap-3">
          {eac && (
            <div className="flex flex-col items-center gap-2 px-4 py-4 rounded"
              style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
              <span className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">EAC</span>
              <NumericAttr attr={eac} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
              <span className="text-[9px] text-ink-soft">vs Energy</span>
            </div>
          )}
          {kac && (
            <div className="flex flex-col items-center gap-2 px-4 py-4 rounded"
              style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
              <span className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">KAC</span>
              <NumericAttr attr={kac} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
              <span className="text-[9px] text-ink-soft">vs Kinetic</span>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="bulk_current" label="Bulk Atual" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="bulk_max" label="Bulk Máximo" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
      {combat.filter(a => a !== eac && a !== kac).map(a => (
        <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
          style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <span className="text-sm text-ink">{a.attribute.name}</span>
          <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
        </div>
      ))}
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'race', label: 'Raça', multi: false },
    { key: 'theme', label: 'Tema', multi: false },
    { key: 'class_abilities', label: 'Habilidades de Classe', multi: true },
    { key: 'xp_current', label: 'XP Atual', multi: false },
  ]
  return (
    <div className="space-y-3">
      {FIELDS.map(f => <TfField key={f.key} tfKey={f.key} label={f.label} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi={f.multi} />)}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'atributos', label: 'Atributos' },
  { id: 'pericias', label: 'Perícias' },
  { id: 'combate', label: 'Combate' },
  { id: 'personagem', label: 'Personagem' },
]

export function StarfinderSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  function refresh() { router.refresh() }

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }}>
      <div className="flex border-b" style={{ borderColor: 'rgba(51,41,29,0.14)', background: 'rgba(51,41,29,0.05)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? ACCENT : '#5f5040', background: isActive ? `${ACCENT}18` : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>
      <div className="p-5 sm:p-6">
        {activeTab === 'atributos'  && <AtributosTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'   && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'combate'    && <CombateTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem' && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
