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

const ACCENT = '#d97706'

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
    </div>
  )
}

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const renown: Attr[] = [], resources: Attr[] = []

  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    const n = a.attribute.name
    if      (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else if (d.startsWith('Renome'))       renown.push(a)
    else if (['Raiva', 'Raiva Atual', 'Gnosis', 'Gnosis Atual', 'Força de Vontade'].includes(n)) resources.push(a)
    else                                   resources.push(a)
  }

  return { physical, social, mental, talents, skills, knowledges, renown, resources }
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

// ── Pool Track (Rage / Gnosis) ────────────────────────────────────────────────

function PoolTrack({ maxAttrName, curAttrName, label, color, attrs, characterId, canEdit, onSaved }: {
  maxAttrName: string; curAttrName: string; label: string; color: string
  attrs: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  const maxAttr = attrs.find(a => a.attribute.name === maxAttrName)
  const curAttr = attrs.find(a => a.attribute.name === curAttrName)
  if (!maxAttr) return null
  const max = maxAttr.value
  const cur = curAttr?.value ?? max

  return (
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}33` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">{label}</p>
        <span className="font-cinzel font-bold" style={{ color }}>{cur} / {max}</span>
      </div>
      {curAttr && (
        <Dots value={cur} max={max} editable={canEdit} attrId={curAttr.id} characterId={characterId} onSaved={onSaved} color={color} />
      )}
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

// ── Formas reference table ────────────────────────────────────────────────────

const FORMAS = [
  { nome: 'Homid',  forca: '+0', destreza: '+0', vigor: '+0', aparencia: '+0', dif: '—' },
  { nome: 'Glabro', forca: '+2', destreza: '+0', vigor: '+2', aparencia: '−1', dif: '6' },
  { nome: 'Crinos', forca: '+4', destreza: '+1', vigor: '+3', aparencia: '0',  dif: '6' },
  { nome: 'Hispo',  forca: '+3', destreza: '+2', vigor: '+3', aparencia: '0',  dif: '7' },
  { nome: 'Lupus',  forca: '+1', destreza: '+3', vigor: '+1', aparencia: '0',  dif: '6' },
]

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'atributos',   label: 'Atributos' },
  { id: 'habilidades', label: 'Habilidades' },
  { id: 'recursos',    label: 'Recursos' },
  { id: 'formas',      label: 'Formas' },
  { id: 'personagem',  label: 'Personagem' },
]

export function WerewolfSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const g = categorize(attributes)

  function refresh() { router.refresh() }

  const rankAttr = attributes.find(a => a.attribute.name === 'Rank')

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
            <AttrCol items={g.physical} label="Físico"  characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.social}   label="Social"  characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.mental}   label="Mental"  characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
          </div>
        )}

        {activeTab === 'habilidades' && (
          <div className="grid grid-cols-3 gap-3">
            <AttrCol items={g.talents}    label="Talentos"      characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.skills}     label="Perícias"      characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
            <AttrCol items={g.knowledges} label="Conhecimentos" characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />
          </div>
        )}

        {activeTab === 'recursos' && (
          <div className="space-y-4">
            <PoolTrack maxAttrName="Raiva" curAttrName="Raiva Atual" label="Raiva" color="#ef4444"
              attrs={attributes} characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <PoolTrack maxAttrName="Gnosis" curAttrName="Gnosis Atual" label="Gnosis" color="#06b6d4"
              attrs={attributes} characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <WillpowerTrack attrs={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />

            {/* Rank */}
            {rankAttr && (
              <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">Rank</p>
                  <span className="font-cinzel font-bold" style={{ color: ACCENT }}>{rankAttr.value}</span>
                </div>
                <Dots value={rankAttr.value} max={5} editable={canEdit} attrId={rankAttr.id}
                  characterId={characterId} onSaved={refresh} color={ACCENT} />
              </div>
            )}

            {/* Renome */}
            {g.renown.length > 0 && (
              <div>
                <SectionDivider title="Renome" />
                <div className="rounded px-3 py-1"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {g.renown.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} max={10} color={ACCENT} />)}
                </div>
              </div>
            )}

            <HealthTrack textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
          </div>
        )}

        {activeTab === 'formas' && (
          <div className="space-y-4">
            <p className="text-[10px] text-saga-dim mb-3">Modificadores de atributo por forma (bônus sobre valor base humano).</p>
            <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {['Forma', 'Força', 'Destreza', 'Vigor', 'Aparência', 'Dif.'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-almendra text-saga-dim uppercase tracking-wider text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FORMAS.map((f, i) => (
                    <tr key={f.nome} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td className="px-3 py-2 font-almendra" style={{ color: ACCENT }}>{f.nome}</td>
                      <td className="px-3 py-2 text-saga-text">{f.forca}</td>
                      <td className="px-3 py-2 text-saga-text">{f.destreza}</td>
                      <td className="px-3 py-2 text-saga-text">{f.vigor}</td>
                      <td className="px-3 py-2 text-saga-text">{f.aparencia}</td>
                      <td className="px-3 py-2 text-saga-text">{f.dif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-saga-dim/60 italic">Crinos: aparência 0 (não se aplica). Dif = dificuldade para controlar a forma.</p>
          </div>
        )}

        {activeTab === 'personagem' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ETF tfKey="breed"   label="Breed / Forma Nativa" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="auspice" label="Auspício"             textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="tribe"   label="Tribo"                textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="totem"   label="Totem da Matilha"     textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            </div>
            <ETF tfKey="gifts"            label="Dons"        textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="rites"            label="Ritos"       textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="background_text"  label="Histórico"   textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
          </div>
        )}
      </div>
    </div>
  )
}
