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

const ACCENT = '#4d7c0f'

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

function NumericAttr({ attr, characterId, canEdit, onSaved, accent = ACCENT }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void; accent?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(attr.value))
  async function save() {
    const n = parseInt(val)
    if (!isNaN(n) && n !== attr.value) { await patchAttr(characterId, attr.id, n); onSaved() }
    setEditing(false)
  }
  if (!canEdit) return <span className="font-cinzel font-bold text-sm" style={{ color: accent }}>{attr.value}</span>
  if (editing) return (
    <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') void save() }}
      className="w-12 bg-parchment/60 border border-gold/40 rounded text-center font-cinzel font-bold text-sm focus:outline-none"
      style={{ color: accent }} />
  )
  return (
    <span className="font-cinzel font-bold text-sm cursor-pointer" style={{ color: accent }}
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

// ── Perícias tab ──────────────────────────────────────────────────────────────

function PericiasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia'))
  const stats = attributes.filter(a => !a.attribute.description?.startsWith('Perícia'))

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="Atributos Primários" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stats.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.06)' }}>
              <span className="text-sm text-ink">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionDivider title="Perícias (d100)" />
        <div className="space-y-1">
          {skills.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.04)' }}>
              <span className="text-sm text-ink">{a.attribute.name}</span>
              <div className="flex items-center gap-3">
                <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
                <span className="text-xs text-ink-soft">{Math.floor(a.value / 2)}</span>
                <span className="text-xs text-ink-soft">{Math.floor(a.value / 5)}</span>
              </div>
            </div>
          ))}
          {skills.length === 0 && <p className="text-sm text-ink-soft text-center py-6">Nenhuma perícia cadastrada.</p>}
        </div>
      </div>
    </div>
  )
}

// ── Vínculos tab ──────────────────────────────────────────────────────────────

function VinculosTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const bonds = [1, 2, 3, 4]

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft leading-relaxed">
        Vínculos representam as pessoas que ainda conectam o agente à humanidade. Cada sessão pode danificar um Vínculo.
      </p>
      {bonds.map(i => {
        const nameField = textFields.find(f => f.key === `bond${i}_name`)
        const scoreField = textFields.find(f => f.key === `bond${i}_score`)
        const score = parseInt(scoreField?.value ?? '0') || 0
        const MAX_SCORE = 10

        async function saveName(v: string) { await saveTextField(characterId, `bond${i}_name`, `Vínculo ${i}`, v); onRefresh() }
        async function saveScore(v: number) { await saveTextField(characterId, `bond${i}_score`, `Vínculo ${i} Pontuação`, String(Math.max(0, Math.min(MAX_SCORE, v)))); onRefresh() }

        return (
          <div key={i} className="rounded p-4" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-cinzel text-xs font-bold" style={{ color: ACCENT }}>Vínculo {i}</span>
              {score === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>Danificado</span>}
            </div>
            {canEdit
              ? <input type="text" defaultValue={nameField?.value ?? ''} onBlur={e => void saveName(e.target.value)}
                  placeholder="Nome do vínculo…"
                  className="w-full bg-parchment/60 border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none text-ink mb-3" />
              : <p className="text-sm text-ink mb-3">{nameField?.value || <span className="text-ink-soft italic">—</span>}</p>
            }
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">Força:</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_SCORE }).map((_, j) => (
                  <button key={j} onClick={() => canEdit && void saveScore(j < score ? j : j + 1)}
                    disabled={!canEdit}
                    className="rounded border transition-all"
                    style={{
                      width: 14, height: 14,
                      background: j < score ? ACCENT : 'transparent',
                      borderColor: j < score ? ACCENT : 'rgba(51,41,29,0.15)',
                      cursor: canEdit ? 'pointer' : 'default',
                    }} />
                ))}
              </div>
              <span className="font-cinzel text-xs font-bold" style={{ color: ACCENT }}>{score}</span>
            </div>
          </div>
        )
      })}
      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="violence_adapted" label="Adaptado à Violência" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="helpless_adapted" label="Adaptado à Impotência" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
      <TfField tfKey="disorders" label="Transtornos" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi />
    </div>
  )
}

// ── Recursos tab ──────────────────────────────────────────────────────────────

function RecursosTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const san = attributes.find(a => ['Sanidade', 'SAN'].some(n => a.attribute.name.includes(n)))
  const bp = san ? Math.floor(san.value / 5) : null

  return (
    <div className="space-y-4">
      {san && (
        <div className="rounded p-4" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Sanidade</p>
          <div className="flex items-center gap-4 mb-2">
            <NumericAttr attr={san} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(51,41,29,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${(san.value / 99) * 100}%`, background: ACCENT }} />
            </div>
            <span className="text-xs text-ink-soft">/ 99</span>
          </div>
          {bp !== null && <p className="text-xs text-ink-soft">Ponto de Ruptura: <span className="font-cinzel font-bold" style={{ color: '#ef4444' }}>{bp}</span></p>}
        </div>
      )}
      <TfField tfKey="agency" label="Agência" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      <TfField tfKey="ops_notes" label="Operações Anteriores" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi />
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'agency', label: 'Agência', multi: false },
    { key: 'occupation', label: 'Ocupação', multi: false },
    { key: 'training', label: 'Treinamento', multi: false },
    { key: 'ops_notes', label: 'Operações Anteriores', multi: true },
  ]
  return (
    <div className="space-y-3">
      {FIELDS.map(f => <TfField key={f.key} tfKey={f.key} label={f.label} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi={f.multi} />)}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'pericias', label: 'Perícias' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'vinculos', label: 'Vínculos' },
  { id: 'personagem', label: 'Personagem' },
]

export function DeltaGreenSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('pericias')
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
        {activeTab === 'pericias'   && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'recursos'   && <RecursosTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'vinculos'   && <VinculosTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem' && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
