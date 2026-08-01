'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

interface Attr {
  id: string
  value: number
  customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}

interface TextField {
  id: string
  key: string
  label: string
  value: string
  order: number
}

interface Props {
  characterId: string
  characterLevel: number
  attributes: Attr[]
  textFields: TextField[]
  canEdit: boolean
}

// Fate ladder: valor → nome + cor
const LADDER: Record<number, [string, string]> = {
  8: ['Lendário', '#ec4899'],
  7: ['Épico', '#ef4444'],
  6: ['Fantástico', '#f59e0b'],
  5: ['Soberbo', '#8b5cf6'],
  4: ['Ótimo', '#c9a22a'],
  3: ['Bom', '#3b82f6'],
  2: ['Justo', '#22c55e'],
  1: ['Razoável', '#a3a3a3'],
  0: ['Medíocre', '#6b7280'],
  [-1]: ['Ruim', '#ef4444'],
}

function ladderName(v: number): [string, string] {
  return LADDER[v] ?? (v > 8 ? ['Épico+', '#ec4899'] : ['Terrível', '#ef4444'])
}

function SectionDivider({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
      {action}
    </div>
  )
}

function AddBtn({ onClick, label = 'Adicionar' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors"
      style={{ background: 'rgba(201,162,42,0.08)', border: '1px solid rgba(201,162,42,0.3)', color: '#c9a22a' }}>
      <Plus size={9} />{label}
    </button>
  )
}

// ── Campos de texto editáveis ──────────────────────────────────────────────────

function EditableTextField({ value, onSave, placeholder, multiline = false }: {
  value: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() { onSave(val); setEditing(false) }

  if (!editing) {
    return (
      <div onClick={() => { setEditing(true); setVal(value) }}
        className="cursor-pointer hover:bg-ink/[0.03] rounded px-2 py-1.5 transition-colors min-h-[32px]">
        {value
          ? <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{value}</p>
          : <p className="text-xs text-ink-soft italic">{placeholder ?? 'Clique para editar…'}</p>
        }
      </div>
    )
  }

  if (multiline) {
    return (
      <textarea autoFocus rows={3} value={val}
        onChange={e => setVal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
        placeholder={placeholder}
        className="w-full bg-parchment/60 border border-gold/40 rounded px-2 py-1.5 text-sm focus:outline-none resize-none text-ink" />
    )
  }
  return (
    <input autoFocus type="text" value={val}
      onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      placeholder={placeholder}
      className="w-full bg-parchment/60 border border-gold/40 rounded px-2 py-1.5 text-sm focus:outline-none text-ink" />
  )
}

// ── Atributo de perícia (valor numérico) ───────────────────────────────────────

function EditableAttr({ attr, characterId, canEdit, onSaved }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(attr.value))

  async function save() {
    const n = parseInt(val)
    if (isNaN(n) || n === attr.value) { setEditing(false); return }
    await fetch(`/api/characters/${characterId}/attributes/${attr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: n }),
    }).catch(() => null)
    setEditing(false)
    onSaved()
  }

  const [lName, lColor] = ladderName(attr.value)

  if (editing) {
    return (
      <input autoFocus type="number" value={val}
        onChange={e => setVal(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
        className="w-10 bg-parchment/60 border border-gold/40 rounded text-center font-cinzel font-bold focus:outline-none text-sm"
        style={{ color: lColor }} />
    )
  }
  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => canEdit && setEditing(true)}>
      <span className="font-cinzel font-bold text-sm leading-none" style={{ color: lColor }}>
        {attr.value >= 0 ? `+${attr.value}` : attr.value}
      </span>
      <span className="text-[9px] rounded px-1 py-0.5" style={{ background: `${lColor}18`, color: lColor }}>{lName}</span>
    </div>
  )
}

// ── Stress boxes ───────────────────────────────────────────────────────────────

function StressBoxes({ count, tfKey, textFields, characterId, canEdit, onRefresh }: {
  count: number; tfKey: string; textFields: TextField[]
  characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)
  // value is "1111000" — '1' = checked (stressed), '0' = available
  const raw = field?.value ?? '0'.repeat(count)
  const boxes = raw.split(',').map(v => v === '1')
  while (boxes.length < count) boxes.push(false)

  async function toggle(i: number) {
    if (!canEdit) return
    const next = [...boxes]
    next[i] = !next[i]
    const encoded = next.map(b => b ? '1' : '0').join(',')
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label: tfKey, value: encoded }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="flex gap-1.5">
      {boxes.slice(0, count).map((checked, i) => (
        <button key={i} onClick={() => void toggle(i)} disabled={!canEdit}
          title={checked ? 'Estressado' : 'Livre'}
          className="rounded border transition-all flex-shrink-0"
          style={{
            width: 16, height: 16,
            background: checked ? '#ef4444' : 'transparent',
            borderColor: checked ? '#ef4444' : 'rgb(var(--ink) / 0.2)',
            cursor: canEdit ? 'pointer' : 'default',
          }} />
      ))}
    </div>
  )
}

// ── Consequência ───────────────────────────────────────────────────────────────

function ConsequenceRow({ label, severity, tfKey, textFields, characterId, canEdit, onRefresh }: {
  label: string; severity: number; tfKey: string; textFields: TextField[]
  characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)

  async function save(value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value }),
    }).catch(() => null)
    onRefresh()
  }

  const hasValue = !!(field?.value)
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded transition-all"
      style={{ background: hasValue ? 'rgba(239,68,68,0.04)' : 'rgb(var(--ink) / 0.02)', border: `1px solid ${hasValue ? 'rgba(239,68,68,0.3)' : 'rgb(var(--ink) / 0.05)'}` }}>
      <div className="flex-shrink-0 mt-1">
        <span className="font-cinzel text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          -{severity}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-almendra text-[9px] text-ink-soft uppercase tracking-wider mb-1">{label}</p>
        {canEdit
          ? <EditableTextField value={field?.value ?? ''} onSave={save} placeholder={`${label}…`} />
          : <p className="text-sm text-ink px-2 py-1">{field?.value || <span className="text-ink-soft italic text-xs">—</span>}</p>
        }
      </div>
    </div>
  )
}

// ── Aspectos tab ───────────────────────────────────────────────────────────────

function AspectsTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const CORE_ASPECTS = [
    { key: 'highConcept', label: 'Conceito Principal', hint: 'Quem você é — sua identidade central' },
    { key: 'trouble',     label: 'Problema',           hint: 'O que complica sua vida' },
    { key: 'aspect3',     label: 'Aspecto Livre 1',    hint: '' },
    { key: 'aspect4',     label: 'Aspecto Livre 2',    hint: '' },
    { key: 'aspect5',     label: 'Aspecto Livre 3',    hint: '' },
  ]

  async function save(key: string, label: string, value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value }),
    }).catch(() => null)
    onRefresh()
  }

  // Refresh/Fate Points from attributes
  const refreshAttr = textFields.find(f => f.key === 'refresh')
  const fateAttr = textFields.find(f => f.key === 'fatePoints')
  const refresh = parseInt(refreshAttr?.value ?? '3') || 3
  const fatePoints = parseInt(fateAttr?.value ?? '3') || 3

  async function adjustFate(delta: number) {
    if (!canEdit) return
    const next = Math.max(0, fatePoints + delta)
    await save('fatePoints', 'Pontos de Destino', String(next))
  }

  async function adjustRefresh(delta: number) {
    if (!canEdit) return
    const next = Math.max(1, refresh + delta)
    await save('refresh', 'Refresh', String(next))
  }

  return (
    <div className="space-y-6">
      {/* Fate Points + Refresh */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg py-4 px-3 text-center"
          style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
          <p className="font-almendra text-[9px] text-ink-soft uppercase tracking-widest mb-2">Pontos de Destino</p>
          <div className="flex items-center justify-center gap-2">
            {canEdit && <button onClick={() => void adjustFate(-1)} className="w-6 h-6 rounded text-ink-soft hover:text-gold">−</button>}
            <span className="font-cinzel font-bold text-3xl text-gold">{fatePoints}</span>
            {canEdit && <button onClick={() => void adjustFate(+1)} className="w-6 h-6 rounded text-ink-soft hover:text-gold">+</button>}
          </div>
        </div>
        <div className="rounded-lg py-4 px-3 text-center"
          style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
          <p className="font-almendra text-[9px] text-ink-soft uppercase tracking-widest mb-2">Refresh</p>
          <div className="flex items-center justify-center gap-2">
            {canEdit && <button onClick={() => void adjustRefresh(-1)} className="w-6 h-6 rounded text-ink-soft hover:text-ink">−</button>}
            <span className="font-cinzel font-bold text-3xl text-ink-soft">{refresh}</span>
            {canEdit && <button onClick={() => void adjustRefresh(+1)} className="w-6 h-6 rounded text-ink-soft hover:text-ink">+</button>}
          </div>
        </div>
      </div>

      {/* Aspectos */}
      <div>
        <SectionDivider title="Aspectos" />
        <div className="space-y-3">
          {CORE_ASPECTS.map(a => {
            const field = textFields.find(f => f.key === a.key)
            return (
              <div key={a.key} className="rounded p-3"
                style={{ background: 'rgba(201,162,42,0.03)', border: '1px solid rgba(201,162,42,0.15)' }}>
                <p className="font-almendra text-[9px] uppercase tracking-widest text-gold/70 mb-1">{a.label}</p>
                {a.hint && <p className="text-[10px] text-ink-soft/60 mb-2 italic">{a.hint}</p>}
                {canEdit
                  ? <EditableTextField value={field?.value ?? ''} onSave={v => void save(a.key, a.label, v)} placeholder={`${a.label}…`} />
                  : <p className="text-sm text-ink px-2 py-1 font-fell italic">{field?.value || <span className="text-ink-soft text-xs not-italic">—</span>}</p>
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Perícias tab ───────────────────────────────────────────────────────────────

function SkillsTab({ attributes, characterId, canEdit, onRefresh, onAdd, onDelete }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
  onAdd: () => void; onDelete: (id: string) => void
}) {
  // Group by value descending (Fate displays skills in a pyramid/column)
  const sorted = [...attributes].sort((a, b) => b.value - a.value)

  // Group by level
  const byLevel: Record<number, Attr[]> = {}
  for (const a of sorted) {
    if (!byLevel[a.value]) byLevel[a.value] = []
    byLevel[a.value]!.push(a)
  }
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => b - a)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">Perícias</p>
        <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
        {canEdit && <AddBtn onClick={onAdd} />}
      </div>

      {levels.length === 0
        ? (
          canEdit
            ? <button onClick={onAdd} className="w-full py-5 rounded border border-dashed text-sm text-ink-soft hover:text-ink-soft transition-colors" style={{ borderColor: 'rgb(var(--ink) / 0.08)' }}>
                + Adicionar perícia
              </button>
            : <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia adicionada.</p>
        )
        : (
          <div className="space-y-3">
            {levels.map(lvl => {
              const [lName, lColor] = ladderName(lvl)
              const attrs = byLevel[lvl] ?? []
              return (
                <div key={lvl}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-cinzel text-sm font-bold" style={{ color: lColor }}>
                      {lvl >= 0 ? `+${lvl}` : lvl}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${lColor}18`, color: lColor, border: `1px solid ${lColor}30` }}>
                      {lName}
                    </span>
                    <div className="flex-1 h-px" style={{ background: `${lColor}20` }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attrs.map(attr => (
                      <div key={attr.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded group"
                        style={{ background: 'rgb(var(--ink) / 0.03)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
                        <span className="text-sm text-ink">{attr.attribute.name}</span>
                        {canEdit && (
                          <button onClick={() => onDelete(attr.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-700/60 hover:text-red-700 ml-1">
                            <X size={9} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

// ── Façanhas tab ───────────────────────────────────────────────────────────────

function StuntsTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const STUNT_KEYS = ['stunt1', 'stunt2', 'stunt3', 'stunt4', 'stunt5']

  async function save(key: string, value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label: `Façanha ${key.replace('stunt', '')}`, value }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-ink-soft leading-relaxed">
        Cada façanha dá um bônus de +2 ou permite usar uma perícia de forma diferente. Reduz o Refresh em 1 por façanha (mínimo 1).
      </p>
      {STUNT_KEYS.map((key, i) => {
        const field = textFields.find(f => f.key === key)
        return (
          <div key={key} className="rounded p-3"
            style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-2">Façanha {i + 1}</p>
            {canEdit
              ? <EditableTextField value={field?.value ?? ''} onSave={v => void save(key, v)} placeholder="Nome e descrição da façanha…" multiline />
              : <p className="text-sm text-ink px-2 py-1 whitespace-pre-wrap">{field?.value || <span className="text-ink-soft italic text-xs">—</span>}</p>
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Estresse & Consequências tab ──────────────────────────────────────────────

function StressTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  // Physique (Físico/Vigor) determines physical stress boxes
  const physique = attributes.find(a => ['Físico', 'Vigor', 'Physique', 'Força'].some(n => a.attribute.name.includes(n)))
  const will     = attributes.find(a => ['Vontade', 'Will', 'Determinação', 'Garra'].some(n => a.attribute.name.includes(n)))

  const physBoxes = physique ? (physique.value >= 3 ? 4 : physique.value >= 1 ? 3 : 2) : 2
  const mentBoxes = will ? (will.value >= 3 ? 4 : will.value >= 1 ? 3 : 2) : 2

  return (
    <div className="space-y-6">
      {/* Estresse */}
      <div>
        <SectionDivider title="Trilhas de Estresse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3 text-center">Físico</p>
            <div className="flex justify-center">
              <StressBoxes count={physBoxes} tfKey="physicalStress" textFields={textFields}
                characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            {physique && <p className="text-[9px] text-ink-soft text-center mt-2">{physBoxes} caixas (Físico +{physique.value})</p>}
          </div>
          <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3 text-center">Mental</p>
            <div className="flex justify-center">
              <StressBoxes count={mentBoxes} tfKey="mentalStress" textFields={textFields}
                characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            {will && <p className="text-[9px] text-ink-soft text-center mt-2">{mentBoxes} caixas (Vontade +{will.value})</p>}
          </div>
        </div>
      </div>

      {/* Consequências */}
      <div>
        <SectionDivider title="Consequências" />
        <div className="space-y-2">
          <ConsequenceRow label="Leve" severity={2} tfKey="consMild"
            textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
          <ConsequenceRow label="Moderada" severity={4} tfKey="consModerate"
            textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
          <ConsequenceRow label="Grave" severity={6} tfKey="consSevere"
            textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
          <ConsequenceRow label="Extrema" severity={8} tfKey="consExtreme"
            textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
        </div>
        <p className="text-[10px] text-ink-soft mt-3 leading-relaxed px-1">
          Consequências são aspectos negativos que podem ser invocados por outros. Extrema substitui um aspecto permanentemente.
        </p>
      </div>

      {/* Notas */}
      <div>
        <SectionDivider title="Notas" />
        {(() => {
          const field = textFields.find(f => f.key === 'notes')
          async function save(v: string) {
            await fetch(`/api/characters/${characterId}/text-fields`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'notes', label: 'Notas', value: v }),
            }).catch(() => null)
            onRefresh()
          }
          return canEdit
            ? <EditableTextField value={field?.value ?? ''} onSave={save} placeholder="Notas da sessão, invocações, etc…" multiline />
            : <p className="text-sm text-ink px-2 py-1 whitespace-pre-wrap">{field?.value || <span className="text-ink-soft italic text-xs">—</span>}</p>
        })()}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'aspectos', label: 'Aspectos' },
  { id: 'pericias', label: 'Perícias' },
  { id: 'fachanhas', label: 'Façanhas' },
  { id: 'estresse', label: 'Estresse' },
]

export function FateCoreSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('aspectos')
  const [addOpen, setAddOpen] = useState(false)

  function refresh() { router.refresh() }

  async function deleteAttr(id: string) {
    await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charAttributeId: id }),
    }).catch(() => null)
    router.refresh()
  }

  // Dynamic import to avoid circular deps
  const [AddModal, setAddModal] = useState<React.ComponentType<{ characterId: string; open: boolean; onClose: () => void }> | null>(null)
  if (addOpen && !AddModal) {
    import('@/components/character/AddAttributeModal').then(m => setAddModal(() => m.AddAttributeModal))
  }

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'rgb(var(--ink) / 0.14)', background: 'rgb(var(--ink) / 0.05)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? '#c9a22a' : 'rgb(var(--ink-soft))', background: isActive ? 'rgba(201,162,42,0.05)' : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: 'linear-gradient(90deg, transparent, #c9a22a, transparent)' }} />}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {activeTab === 'aspectos'  && <AspectsTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'  && <SkillsTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} onAdd={() => setAddOpen(true)} onDelete={id => void deleteAttr(id)} />}
        {activeTab === 'fachanhas' && <StuntsTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'estresse'  && <StressTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>

      {canEdit && AddModal && (
        <AddModal characterId={characterId} open={addOpen} onClose={() => { setAddOpen(false); setAddModal(null) }} />
      )}
    </div>
  )
}
