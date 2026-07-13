'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr {
  id: string
  value: number
  customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}
interface TextField {
  id: string; key: string; label: string; value: string; order: number
}
interface Props {
  characterId: string; characterLevel: number; attributes: Attr[]
  textFields: TextField[]; weapons?: unknown[]; spellSlots?: unknown[]; canEdit: boolean
}

const ACCENT = '#5a9e8f'

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
    if (!isNaN(n) && n !== attr.value) {
      await patchAttr(characterId, attr.id, n)
      onSaved()
    }
    setEditing(false)
  }

  if (!canEdit) return <span className="font-cinzel font-bold text-sm" style={{ color: ACCENT }}>{attr.value}</span>
  if (editing) {
    return (
      <input autoFocus type="number" value={val}
        onChange={e => setVal(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') void save() }}
        className="w-12 bg-parchment/60 border border-gold/40 rounded text-center font-cinzel font-bold text-sm focus:outline-none"
        style={{ color: ACCENT }} />
    )
  }
  return (
    <span className="font-cinzel font-bold text-sm cursor-pointer" style={{ color: ACCENT }}
      onClick={() => { setEditing(true); setVal(String(attr.value)) }}>
      {attr.value}
    </span>
  )
}

function TripleValue({ attr, characterId, canEdit, onSaved }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  const half = Math.floor(attr.value / 2)
  const fifth = Math.floor(attr.value / 5)
  return (
    <div className="flex items-center gap-3">
      <NumericAttr attr={attr} characterId={characterId} canEdit={canEdit} onSaved={onSaved} />
      <span className="text-xs text-ink-soft">{half}</span>
      <span className="text-xs text-ink-soft">{fifth}</span>
    </div>
  )
}

function TfField({ tfKey, label, characterId, textFields, canEdit, onRefresh, multi = false }: {
  tfKey: string; label: string; characterId: string; textFields: TextField[]
  canEdit: boolean; onRefresh: () => void; multi?: boolean
}) {
  const field = textFields.find(f => f.key === tfKey)
  async function save(v: string) {
    await saveTextField(characterId, tfKey, label, v)
    onRefresh()
  }
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

// ── Características tab ───────────────────────────────────────────────────────

function CaracteristicasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const chars = attributes.filter(a => a.attribute.description?.startsWith('Característica'))
  const derived = attributes.filter(a => a.attribute.description?.startsWith('Derivado'))

  const str = chars.find(a => ['FOR', 'STR', 'Força'].some(n => a.attribute.name.includes(n)))
  const siz = chars.find(a => ['TAM', 'SIZ', 'Tamanho'].some(n => a.attribute.name.includes(n)))
  const damageBonus = str && siz ? str.value + siz.value : null

  function dbLabel(total: number) {
    if (total <= 64) return '−2'
    if (total <= 84) return '−1'
    if (total <= 124) return '0'
    if (total <= 164) return '+1d4'
    if (total <= 204) return '+1d6'
    return '+2d6'
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="Características" />
        <div className="rounded overflow-hidden" style={{ border: '1px solid rgb(var(--ink) / 0.14)' }}>
          <div className="grid grid-cols-4 px-3 py-1.5 text-[9px] font-almendra uppercase tracking-widest text-ink-soft"
            style={{ background: 'rgb(var(--ink) / 0.06)' }}>
            <span>Nome</span><span className="text-center">Valor</span><span className="text-center">÷2</span><span className="text-center">÷5</span>
          </div>
          {chars.map(a => (
            <div key={a.id} className="grid grid-cols-4 px-3 py-2 items-center"
              style={{ borderTop: '1px solid rgb(var(--ink) / 0.04)' }}>
              <span className="text-sm text-ink">{a.attribute.name}</span>
              <div className="flex justify-center"><NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} /></div>
              <span className="text-center text-xs text-ink-soft">{Math.floor(a.value / 2)}</span>
              <span className="text-center text-xs text-ink-soft">{Math.floor(a.value / 5)}</span>
            </div>
          ))}
        </div>
        {damageBonus !== null && (
          <div className="mt-2 px-3 py-2 rounded text-sm" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
            <span className="text-ink-soft text-xs">Bônus de Dano (FOR+TAM={damageBonus}): </span>
            <span className="font-cinzel font-bold" style={{ color: ACCENT }}>{dbLabel(damageBonus)}</span>
          </div>
        )}
      </div>

      <div>
        <SectionDivider title="Derivados" />
        <div className="space-y-2">
          {derived.map(a => {
            const isSan = ['Sanidade', 'SAN', 'San'].some(n => a.attribute.name.includes(n))
            const pod = chars.find(c => ['POD', 'Poder'].some(n => c.attribute.name.includes(n)))
            return (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
                <span className="text-sm text-ink">{a.attribute.name}</span>
                {isSan && pod ? (
                  <div className="flex items-center gap-3">
                    <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--ink) / 0.1)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (a.value / Math.max(1, pod.value)) * 100)}%`, background: ACCENT }} />
                    </div>
                    <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
                    <span className="text-xs text-ink-soft">/ {pod.value}</span>
                  </div>
                ) : (
                  <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Perícias tab ──────────────────────────────────────────────────────────────

function PericiasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia'))

  const grouped: Record<string, Attr[]> = {}
  for (const s of skills) {
    const desc = s.attribute.description ?? ''
    const match = desc.match(/Perícia[,:]?\s*([^,]+)/)?.[1]?.trim() ?? 'Geral'
    if (!grouped[match]) grouped[match] = []
    grouped[match]!.push(s)
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, attrs]) => (
        <div key={cat}>
          <SectionDivider title={cat} />
          <div className="rounded overflow-hidden" style={{ border: '1px solid rgb(var(--ink) / 0.14)' }}>
            <div className="grid grid-cols-4 px-3 py-1 text-[9px] font-almendra uppercase tracking-widest text-ink-soft"
              style={{ background: 'rgb(var(--ink) / 0.06)' }}>
              <span className="col-span-2">Perícia</span><span className="text-center">÷2</span><span className="text-center">÷5</span>
            </div>
            {attrs.map(a => (
              <div key={a.id} className="grid grid-cols-4 px-3 py-2 items-center"
                style={{ borderTop: '1px solid rgb(var(--ink) / 0.04)' }}>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-sm text-ink">{a.attribute.name}</span>
                  <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
                </div>
                <span className="text-center text-xs text-ink-soft">{Math.floor(a.value / 2)}</span>
                <span className="text-center text-xs text-ink-soft">{Math.floor(a.value / 5)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {skills.length === 0 && <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia encontrada.</p>}
    </div>
  )
}

// ── Combate tab ───────────────────────────────────────────────────────────────

function CombateTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const combat = attributes.filter(a => ['Combate', 'Arma', 'Esquiva', 'Luta'].some(n => a.attribute.description?.includes(n)))
  const pvAttr = attributes.find(a => ['PV', 'Pontos de Vida', 'HP'].some(n => a.attribute.name.includes(n)))

  return (
    <div className="space-y-5">
      {pvAttr && (
        <div className="rounded p-4" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Pontos de Vida</p>
          <div className="flex items-center gap-4">
            <NumericAttr attr={pvAttr} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgb(var(--ink) / 0.1)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (pvAttr.value / 20) * 100)}%`, background: ACCENT }} />
            </div>
          </div>
        </div>
      )}
      <div>
        <SectionDivider title="Perícias de Combate" />
        <div className="space-y-1">
          {combat.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
              <span className="text-sm text-ink">{a.attribute.name}</span>
              <TripleValue attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
          {combat.length === 0 && <p className="text-sm text-ink-soft text-center py-4">Nenhuma perícia de combate cadastrada.</p>}
        </div>
      </div>
      <TfField tfKey="luck_current" label="Sorte Atual" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      <div className="rounded p-3 text-sm text-ink-soft" style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        <p className="font-almendra text-[9px] uppercase tracking-widest mb-2">Dados de Bônus/Penalidade</p>
        <p>Dado de Bônus: role 2× e fique com a dezena <span className="text-ink font-bold">mais baixa</span>.</p>
        <p>Dado de Penalidade: role 2× e fique com a dezena <span className="text-ink font-bold">mais alta</span>.</p>
      </div>
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'occupation', label: 'Ocupação', multi: false },
    { key: 'credit_rating', label: 'Credenciamento', multi: false },
    { key: 'fortune_max', label: 'Fortuna Máxima', multi: false },
    { key: 'fortune_current', label: 'Fortuna Atual', multi: false },
    { key: 'languages', label: 'Idiomas', multi: false },
    { key: 'description', label: 'Descrição Física', multi: true },
    { key: 'backstory', label: 'Histórico', multi: true },
  ]
  return (
    <div className="space-y-3">
      {FIELDS.map(f => (
        <TfField key={f.key} tfKey={f.key} label={f.label} characterId={characterId}
          textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi={f.multi} />
      ))}
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

export function CoC7eSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
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
              style={{ color: isActive ? ACCENT : 'rgb(var(--ink-soft))', background: isActive ? `${ACCENT}0d` : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>
      <div className="p-5 sm:p-6">
        {activeTab === 'caracteristicas' && <CaracteristicasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'        && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'combate'         && <CombateTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem'      && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
