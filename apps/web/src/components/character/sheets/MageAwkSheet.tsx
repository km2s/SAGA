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
  id: string
  key: string
  label: string
  value: string
  order: number
}

interface Props {
  characterId: string
  attributes: Attr[]
  textFields: TextField[]
  weapons: unknown[]
  canEdit: boolean
}

const ACCENT = '#06b6d4'

// ── Helpers ───────────────────────────────────────────────────────────────────

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const arcana: Attr[] = [], resources: Attr[] = []

  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    if      (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else if (d.startsWith('Arcano'))       arcana.push(a)
    else                                   resources.push(a)
  }

  return { physical, social, mental, talents, skills, knowledges, arcana, resources }
}

// ── Dots ─────────────────────────────────────────────────────────────────────

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = ACCENT }: {
  value: number; max?: number; editable?: boolean
  attrId?: string; characterId?: string; onSaved?: () => void; color?: string
}) {
  async function handleClick(i: number) {
    if (!editable || !attrId || !characterId || !onSaved) return
    const newVal = i + 1 === value ? i : i + 1
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newVal }),
    }).catch(() => null)
    onSaved()
  }

  return (
    <div className="flex gap-[5px] items-center">
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} onClick={() => void handleClick(i)} disabled={!editable}
          className="rounded-full border flex-shrink-0 transition-all"
          style={{
            width: 11, height: 11,
            background: i < value ? color : 'transparent',
            borderColor: i < value ? color : 'rgba(255,255,255,0.15)',
            cursor: editable ? 'pointer' : 'default',
          }} />
      ))}
    </div>
  )
}

function DotRow({ attr, characterId, canEdit, onSaved, max = 5, color }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void
  max?: number; color?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="font-almendra text-[11px] text-saga-text truncate">{attr.attribute.name}</span>
      <Dots value={attr.value} max={max} editable={canEdit} attrId={attr.id} characterId={characterId} onSaved={onSaved} color={color} />
    </div>
  )
}

function AttrCol({ items, label, characterId, canEdit, onSaved, max = 5, color }: {
  items: Attr[]; label: string; characterId: string; canEdit: boolean; onSaved: () => void
  max?: number; color?: string
}) {
  return (
    <div>
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.15em] text-center mb-3 pb-2 border-b"
        style={{ borderColor: 'rgba(201,162,42,0.2)' }}>{label}</p>
      <div className="rounded px-3 py-1 min-h-[40px]"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {items.length === 0
          ? <p className="text-[10px] text-saga-dim py-4 text-center italic">—</p>
          : items.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={onSaved} max={max} color={color} />)
        }
      </div>
    </div>
  )
}

// ── Health Track ──────────────────────────────────────────────────────────────

const HEALTH_LEVELS = [
  { label: 'Contundido',    penalty: 0 },
  { label: 'Machucado',     penalty: -1 },
  { label: 'Ferido',        penalty: -1 },
  { label: 'Gravemente F.', penalty: -2 },
  { label: 'Mutilado',      penalty: -2 },
  { label: 'Aleijado',      penalty: -5 },
  { label: 'Incapacitado',  penalty: null },
]

function HealthTrack({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === 'healthTrack')
  const raw = field?.value ?? ''
  const boxes: (0 | 1 | 2)[] = raw ? raw.split(',').map(v => Number(v) as 0 | 1 | 2) : Array(7).fill(0)
  while (boxes.length < 7) boxes.push(0)

  async function cycleBox(i: number) {
    if (!canEdit) return
    const next = [...boxes]
    next[i] = next[i] === 0 ? 1 : next[i] === 1 ? 2 : 0
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'healthTrack', label: 'Trilha de Saúde', value: next.join(',') }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-3">Trilha de Saúde</p>
      <div className="space-y-1">
        {HEALTH_LEVELS.map((level, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => void cycleBox(i)} disabled={!canEdit}
              className="rounded border flex items-center justify-center transition-all flex-shrink-0"
              style={{
                width: 20, height: 20,
                background: boxes[i] === 2 ? 'rgba(239,68,68,0.15)' : boxes[i] === 1 ? 'rgba(251,191,36,0.08)' : 'transparent',
                borderColor: boxes[i] === 2 ? '#ef4444' : boxes[i] === 1 ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                cursor: canEdit ? 'pointer' : 'default', fontSize: 10,
              }}>
              {boxes[i] === 2 ? '✗' : boxes[i] === 1 ? '/' : ''}
            </button>
            <span className="text-[10px] text-saga-text flex-1">{level.label}</span>
            <span className="text-[10px] text-saga-dim">
              {level.penalty === null ? 'Incap.' : level.penalty === 0 ? '—' : String(level.penalty)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Willpower ─────────────────────────────────────────────────────────────────

function WillpowerTrack({ attrs, textFields, characterId, canEdit, onRefresh }: {
  attrs: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const wp = attrs.find(a => a.attribute.name === 'Força de Vontade')
  const totalWP = wp?.value ?? 0
  const field = textFields.find(f => f.key === 'willpowerUsed')
  const used = parseInt(field?.value ?? '0') || 0

  async function toggleWP(i: number) {
    if (!canEdit) return
    const next = i < used ? i : i + 1
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'willpowerUsed', label: 'Força de Vontade Gasta', value: String(next) }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">Força de Vontade</p>
        <span className="font-cinzel font-bold" style={{ color: ACCENT }}>{totalWP - used} / {totalWP}</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: totalWP }).map((_, i) => (
          <button key={i} onClick={() => void toggleWP(i)} disabled={!canEdit}
            className="rounded-full border transition-all flex-shrink-0"
            style={{
              width: 14, height: 14,
              background: i < (totalWP - used) ? ACCENT : 'rgba(120,120,160,0.2)',
              borderColor: i < (totalWP - used) ? ACCENT : 'rgba(120,120,160,0.4)',
              cursor: canEdit ? 'pointer' : 'default',
            }} />
        ))}
      </div>
    </div>
  )
}

// ── ETF ───────────────────────────────────────────────────────────────────────

function ETF({ tfKey, label, textFields, characterId, canEdit, multiline = false, onRefresh }: {
  tfKey: string; label: string; textFields: TextField[]; characterId: string; canEdit: boolean
  multiline?: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(field?.value ?? '')

  async function save() {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value: val }),
    }).catch(() => null)
    setEditing(false)
    onRefresh()
  }

  return (
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-2">{label}</p>
      {editing && canEdit ? (
        multiline
          ? <textarea autoFocus rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={() => void save()}
              className="w-full bg-surface-2 border border-gold/40 rounded px-2 py-1.5 text-sm focus:outline-none resize-none" />
          : <input autoFocus type="text" value={val} onChange={e => setVal(e.target.value)}
              onBlur={() => void save()} onKeyDown={e => { if (e.key === 'Enter') void save() }}
              className="w-full bg-surface-2 border border-gold/40 rounded px-2 py-1.5 text-sm focus:outline-none" />
      ) : (
        <div onClick={() => canEdit && setEditing(true)}
          className={`${canEdit ? 'cursor-pointer hover:bg-white/[0.03]' : ''} rounded px-2 py-1 min-h-[28px] transition-colors`}>
          {field?.value
            ? <p className="text-sm text-saga-text whitespace-pre-wrap">{field.value}</p>
            : <p className="text-xs text-saga-dim italic">{canEdit ? 'Clique para editar…' : '—'}</p>
          }
        </div>
      )}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'atributos',   label: 'Atributos' },
  { id: 'habilidades', label: 'Habilidades' },
  { id: 'arcanos',     label: 'Arcanos' },
  { id: 'recursos',    label: 'Recursos' },
  { id: 'personagem',  label: 'Personagem' },
]

export function MageAwkSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const g = categorize(attributes)

  function refresh() { router.refresh() }

  const gnoseAttr    = attributes.find(a => a.attribute.name === 'Gnose')
  const manaAttr     = attributes.find(a => a.attribute.name === 'Mana')
  const sabeAttr     = attributes.find(a => a.attribute.name === 'Sabedoria')

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>

      <div className="flex flex-wrap border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? ACCENT : '#7878a0', background: isActive ? `${ACCENT}11` : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">

        {activeTab === 'atributos' && (
          <div className="grid grid-cols-3 gap-3">
            <AttrCol items={g.mental}   label="Mental"  characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.physical} label="Físico"  characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.social}   label="Social"  characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
          </div>
        )}

        {activeTab === 'habilidades' && (
          <div className="grid grid-cols-3 gap-3">
            <AttrCol items={g.talents}    label="Talentos"      characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.skills}     label="Perícias"      characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.knowledges} label="Conhecimentos" characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
          </div>
        )}

        {activeTab === 'arcanos' && (
          <div className="space-y-2">
            <p className="text-[10px] text-saga-dim mb-4">Os 10 arcanos representam domínios de poder sobrenatural. Sabedoria se perde ao praticar magia proibida — trate-a com cuidado.</p>
            {g.arcana.length === 0 && (
              <p className="text-[11px] text-saga-dim italic text-center py-6">Nenhum arcano adicionado.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {g.arcana.map(a => (
                <div key={a.id} className="rounded p-3 flex items-center justify-between"
                  style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}22` }}>
                  <span className="font-almendra text-[11px]" style={{ color: ACCENT }}>{a.attribute.name}</span>
                  <Dots value={a.value} max={5} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={refresh} color={ACCENT} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recursos' && (
          <div className="space-y-4">
            {/* Gnose */}
            {gnoseAttr && (
              <div className="rounded p-3" style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}33` }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-almendra text-[9px] uppercase tracking-widest" style={{ color: ACCENT }}>Gnose</p>
                  <span className="font-cinzel font-bold" style={{ color: ACCENT }}>{gnoseAttr.value} / 10</span>
                </div>
                <Dots value={gnoseAttr.value} max={10} editable={canEdit} attrId={gnoseAttr.id}
                  characterId={characterId} onSaved={refresh} color={ACCENT} />
              </div>
            )}

            {/* Mana */}
            {manaAttr && (
              <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">Mana</p>
                  <span className="font-cinzel font-bold text-gold">{manaAttr.value}</span>
                </div>
              </div>
            )}

            {/* Sabedoria — nota de aviso */}
            {sabeAttr && (
              <div className="rounded p-3" style={{ background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-almendra text-[9px] uppercase tracking-widest text-yellow-400">Sabedoria</p>
                  <span className="font-cinzel font-bold text-yellow-400">{sabeAttr.value} / 10</span>
                </div>
                <Dots value={sabeAttr.value} max={10} editable={canEdit} attrId={sabeAttr.id}
                  characterId={characterId} onSaved={refresh} color="#eab308" />
                <p className="text-[9px] text-yellow-400/60 mt-2 italic">Perda de Sabedoria resulta em degradação moral e eventualmente loucura.</p>
              </div>
            )}

            <WillpowerTrack attrs={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            <HealthTrack textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
          </div>
        )}

        {activeTab === 'personagem' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ETF tfKey="path"       label="Caminho / Path"  textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="order"      label="Ordem"           textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="legacy"     label="Legado"          textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="nimbus"     label="Nimbus"          textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="xp_current" label="XP Atual"        textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="xp_total"   label="XP Gasto"        textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
