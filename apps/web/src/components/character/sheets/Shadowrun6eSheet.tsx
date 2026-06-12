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

const ACCENT = '#ea580c'

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
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
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
      className="w-12 bg-surface-2 border border-gold/40 rounded text-center font-cinzel font-bold text-sm focus:outline-none"
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
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-2">{label}</p>
      {canEdit
        ? multi
          ? <textarea defaultValue={field?.value ?? ''} rows={3} onBlur={e => void save(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none resize-none text-saga-text" />
          : <input type="text" defaultValue={field?.value ?? ''} onBlur={e => void save(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none text-saga-text" />
        : <p className="text-sm text-saga-text px-2 whitespace-pre-wrap">{field?.value || <span className="text-saga-dim italic text-xs">—</span>}</p>
      }
    </div>
  )
}

function ConditionMonitor({ label, boxes, tfKey, textFields, characterId, canEdit, onRefresh }: {
  label: string; boxes: number; tfKey: string; textFields: TextField[]
  characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)
  const filled = parseInt(field?.value ?? '0') || 0

  async function setFilled(v: number) {
    if (!canEdit) return
    await saveTextField(characterId, tfKey, label, String(Math.max(0, Math.min(boxes, v))))
    onRefresh()
  }

  return (
    <div className="rounded p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">{label}</p>
        <span className="font-cinzel text-xs font-bold" style={{ color: ACCENT }}>{filled}/{boxes}</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: boxes }).map((_, i) => (
          <button key={i} onClick={() => canEdit && void setFilled(i < filled ? i : i + 1)}
            disabled={!canEdit}
            className="rounded border transition-all"
            style={{
              width: 16, height: 16,
              background: i < filled ? ACCENT : 'transparent',
              borderColor: i < filled ? ACCENT : 'rgba(255,255,255,0.2)',
              cursor: canEdit ? 'pointer' : 'default',
            }} />
        ))}
      </div>
    </div>
  )
}

// ── Atributos tab ─────────────────────────────────────────────────────────────

function AtributosTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const MAIN = ['Corpo', 'Agilidade', 'Reação', 'Força', 'Vontade', 'Lógica', 'Intuição', 'Carisma']
  const RECURSOS = ['Essência', 'Magia', 'Resonância', 'Edge']

  const mains = attributes.filter(a => MAIN.some(n => a.attribute.name.includes(n)))
  const recursos = attributes.filter(a => RECURSOS.some(n => a.attribute.name.includes(n)))

  const reacao = mains.find(a => a.attribute.name.includes('Reação'))
  const intuicao = mains.find(a => a.attribute.name.includes('Intuição'))
  const initiativeFormula = reacao && intuicao ? `${reacao.value + intuicao.value} + 1d6` : '— + 1d6'

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="Atributos" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mains.map(a => (
            <div key={a.id} className="flex flex-col items-center gap-1 px-3 py-3 rounded"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="font-cinzel text-[10px] uppercase text-saga-dim text-center">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded p-3" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
        <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-1">Iniciativa</p>
        <span className="font-cinzel font-bold" style={{ color: ACCENT }}>{initiativeFormula}</span>
      </div>

      {recursos.length > 0 && (
        <div>
          <SectionDivider title="Recursos Especiais" />
          <div className="grid grid-cols-2 gap-2">
            {recursos.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-sm text-saga-text">{a.attribute.name}</span>
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
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia Ativa'))
  return (
    <div>
      <SectionDivider title="Perícias Ativas" />
      <div className="space-y-1">
        {skills.map(a => (
          <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-sm text-saga-text">{a.attribute.name}</span>
            <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
          </div>
        ))}
        {skills.length === 0 && <p className="text-sm text-saga-dim text-center py-8">Nenhuma perícia cadastrada.</p>}
      </div>
    </div>
  )
}

// ── Condição tab ──────────────────────────────────────────────────────────────

function CondicaoTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const corpo = attributes.find(a => a.attribute.name.includes('Corpo'))
  const vontade = attributes.find(a => a.attribute.name.includes('Vontade'))
  const edgeAttr = attributes.find(a => a.attribute.name.includes('Edge'))

  const physBoxes = corpo ? 8 + Math.ceil(corpo.value / 2) : 8
  const mentBoxes = vontade ? 8 + Math.ceil(vontade.value / 2) : 8

  return (
    <div className="space-y-5">
      <ConditionMonitor label="Monitor Físico" boxes={physBoxes} tfKey="physical_damage"
        textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
      <ConditionMonitor label="Monitor Mental" boxes={mentBoxes} tfKey="mental_damage"
        textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />

      {edgeAttr && (
        <div className="rounded p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-3">Edge</p>
          <div className="flex items-center gap-3">
            <TfField tfKey="edge_current" label="Atual" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
            <span className="text-saga-dim text-sm">/ {edgeAttr.value}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="karma_current" label="Karma Atual" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="karma_total" label="Karma Total" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
      <TfField tfKey="nuyen" label="Nuyen" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'metatype', label: 'Metatipo', multi: false },
    { key: 'qualities', label: 'Qualidades', multi: true },
    { key: 'cyberware', label: 'Cyberware/Bioware', multi: true },
    { key: 'contacts', label: 'Contatos', multi: true },
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
  { id: 'condicao', label: 'Condição' },
  { id: 'personagem', label: 'Personagem' },
]

export function Shadowrun6eSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  function refresh() { router.refresh() }

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? ACCENT : '#7878a0', background: isActive ? `${ACCENT}18` : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>
      <div className="p-5 sm:p-6">
        {activeTab === 'atributos'  && <AtributosTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'   && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'condicao'   && <CondicaoTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem' && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
