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

const ACCENT = '#06b6d4'

const STAT_NAMES = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP']

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

// ── STATs tab ─────────────────────────────────────────────────────────────────

function StatsTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const stats = attributes.filter(a => STAT_NAMES.some(n => a.attribute.name.toUpperCase() === n))
  const body = stats.find(a => a.attribute.name.toUpperCase() === 'BODY')
  const emp = stats.find(a => a.attribute.name.toUpperCase() === 'EMP')
  const maxHp = body ? 10 + body.value * 5 : null
  const maxHumanity = emp ? emp.value * 10 : null

  return (
    <div className="space-y-5">
      <div>
        <SectionDivider title="STATs" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stats.map(a => (
            <div key={a.id} className="flex flex-col items-center gap-1 px-3 py-3 rounded"
              style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
              <span className="font-cinzel text-[10px] uppercase text-ink-soft">{a.attribute.name}</span>
              <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
            </div>
          ))}
        </div>
      </div>

      {maxHp && (
        <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-1">HP Máximo (10 + BODY×5)</p>
          <span className="font-cinzel font-bold text-xl" style={{ color: ACCENT }}>{maxHp}</span>
        </div>
      )}

      {maxHumanity && (
        <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-2">Humanidade (EMP×10)</p>
          <div className="flex items-center gap-3">
            <TfField tfKey="humanity_current" label="" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
            <span className="text-xs text-ink-soft">/ {maxHumanity}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TfField tfKey="role_ability" label="Habilidade de Papel" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
        <TfField tfKey="reputation" label="Reputação" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
      </div>
    </div>
  )
}

// ── Perícias tab ──────────────────────────────────────────────────────────────

function PericiasTab({ attributes, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const skills = attributes.filter(a => !STAT_NAMES.some(n => a.attribute.name.toUpperCase() === n))
  const grouped: Record<string, Attr[]> = {}
  for (const s of skills) {
    const desc = s.attribute.description ?? 'Outros'
    const cat = desc.split(' ')[0] ?? 'Outros'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat]!.push(s)
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, attrs]) => (
        <div key={cat}>
          <SectionDivider title={cat} />
          <div className="space-y-1">
            {attrs.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.04)' }}>
                <span className="text-sm text-ink">{a.attribute.name}</span>
                <NumericAttr attr={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {skills.length === 0 && <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia cadastrada.</p>}
    </div>
  )
}

// ── Combate tab ───────────────────────────────────────────────────────────────

function CombateTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <SectionDivider title="Armadura" />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Cabeça</p>
            <div className="space-y-2">
              <TfField tfKey="armor_head_sp" label="SP" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
              <TfField tfKey="armor_head_pen" label="Penalidade" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
          <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Corpo</p>
            <div className="space-y-2">
              <TfField tfKey="armor_body_sp" label="SP" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
              <TfField tfKey="armor_body_pen" label="Penalidade" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      </div>
      <TfField tfKey="cyberware_list" label="Cyberware" characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} multi />
    </div>
  )
}

// ── Personagem tab ────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'role', label: 'Papel (Role)', multi: false },
    { key: 'origin', label: 'Origens', multi: false },
    { key: 'family', label: 'Família', multi: false },
    { key: 'friends_enemies', label: 'Amigos e Inimigos', multi: true },
    { key: 'style', label: 'Estilo', multi: false },
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
  { id: 'stats', label: 'STATs' },
  { id: 'pericias', label: 'Perícias' },
  { id: 'combate', label: 'Combate' },
  { id: 'personagem', label: 'Personagem' },
]

export function CyberpunkRedSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('stats')
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
        {activeTab === 'stats'      && <StatsTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'pericias'   && <PericiasTab attributes={attributes} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'combate'    && <CombateTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem' && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
