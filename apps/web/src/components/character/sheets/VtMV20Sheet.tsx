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

const ACCENT = '#9d5af5'

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
  const virtues: Attr[] = [], resources: Attr[] = []

  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    if      (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else if (d.startsWith('Virtude'))      virtues.push(a)
    else                                   resources.push(a)
  }

  return { physical, social, mental, talents, skills, knowledges, virtues, resources }
}

// ── Generation limits ─────────────────────────────────────────────────────────

function genLimits(gen: number): { bloodPool: number; maxTrait: number } {
  if (gen <= 4)  return { bloodPool: 30, maxTrait: 10 }
  if (gen <= 6)  return { bloodPool: 20, maxTrait: 9 }
  if (gen <= 8)  return { bloodPool: 15, maxTrait: 8 }
  if (gen <= 10) return { bloodPool: 14, maxTrait: 7 }
  if (gen <= 12) return { bloodPool: 12, maxTrait: 6 }
  return { bloodPool: 10, maxTrait: 5 }
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

// ── V20 Health Track (7 boxes with penalties) ─────────────────────────────────

const HEALTH_LEVELS = [
  { label: 'Contundido',    penalty: 0 },
  { label: 'Machucado',     penalty: -1 },
  { label: 'Ferido',        penalty: -1 },
  { label: 'Gravemente F.', penalty: -2 },
  { label: 'Mutilado',      penalty: -2 },
  { label: 'Aleijado',      penalty: -5 },
  { label: 'Incapacitado',  penalty: null },
]

function V20HealthTrack({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === 'healthTrack')
  const raw = field?.value ?? ''
  // Each box: 0=empty, 1=superficial, 2=aggravated
  const boxes: (0 | 1 | 2)[] = raw
    ? raw.split(',').map(v => (Number(v) as 0 | 1 | 2))
    : Array(7).fill(0)
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

  // Current penalty: find the worst filled box
  let currentPenalty: number | null = 0
  for (let i = 6; i >= 0; i--) {
    if (boxes[i] > 0) {
      currentPenalty = HEALTH_LEVELS[i].penalty
      break
    }
  }

  return (
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">Trilha de Saúde</p>
        {currentPenalty !== 0 && currentPenalty !== null && (
          <span className="text-[10px] text-red-400 font-cinzel">Penalidade: {currentPenalty}</span>
        )}
        {currentPenalty === null && (
          <span className="text-[10px] text-red-500 font-cinzel">INCAPACITADO</span>
        )}
      </div>
      <div className="space-y-1">
        {HEALTH_LEVELS.map((level, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => void cycleBox(i)} disabled={!canEdit}
              className="rounded border flex items-center justify-center transition-all flex-shrink-0"
              style={{
                width: 20, height: 20,
                background: boxes[i] === 2 ? 'rgba(239,68,68,0.15)' : boxes[i] === 1 ? 'rgba(251,191,36,0.08)' : 'transparent',
                borderColor: boxes[i] === 2 ? '#ef4444' : boxes[i] === 1 ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                cursor: canEdit ? 'pointer' : 'default',
                fontSize: 10,
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
      {canEdit && <p className="text-[9px] text-saga-dim/50 mt-2">Clique: vazio → / (Superf.) → ✗ (Agrav.) → vazio</p>}
    </div>
  )
}

// ── Bloodpool ────────────────────────────────────────────────────────────────

function BloodpoolTrack({ attrs, characterId, canEdit, onSaved, maxBlood }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void; maxBlood: number
}) {
  const blood = attrs.find(a => ['Sangue', 'Sangue Atual'].some(n => a.attribute.name === n))
  if (!blood) return null

  return (
    <div className="rounded p-3" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-red-400">Reserva de Sangue</p>
        <span className="font-cinzel font-bold text-red-400">{blood.value} / {maxBlood}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: maxBlood }).map((_, i) => (
          <div key={i} className="rounded-full border flex-shrink-0"
            style={{
              width: 10, height: 10,
              background: i < blood.value ? '#ef4444' : 'transparent',
              borderColor: i < blood.value ? '#ef4444' : 'rgba(239,68,68,0.3)',
            }} />
        ))}
      </div>
      <div className="mt-2">
        <Dots value={blood.value} max={Math.min(maxBlood, 20)} editable={canEdit} attrId={blood.id}
          characterId={characterId} onSaved={onSaved} color="#ef4444" />
      </div>
    </div>
  )
}

// ── Willpower (V20 style — from attribute max) ─────────────────────────────────

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
      {totalWP === 0 && <p className="text-[9px] text-saga-dim italic mt-1">Adicione o atributo Força de Vontade.</p>}
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
  { id: 'disciplinas', label: 'Disciplinas/Antecedentes' },
  { id: 'recursos',    label: 'Recursos' },
  { id: 'personagem',  label: 'Personagem' },
]

export function VtMV20Sheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const g = categorize(attributes)

  function refresh() { router.refresh() }

  const genAttr = attributes.find(a => a.attribute.name === 'Geração')
  const genValue = genAttr?.value ?? 13
  const limits = genLimits(genValue)

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Tab bar */}
      <div className="flex flex-wrap border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? ACCENT : '#7878a0', background: isActive ? 'rgba(157,90,245,0.05)' : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">

        {/* Atributos */}
        {activeTab === 'atributos' && (
          <div className="grid grid-cols-3 gap-3">
            <AttrCol items={g.physical} label="Físico"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <AttrCol items={g.social}   label="Social"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <AttrCol items={g.mental}   label="Mental"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
          </div>
        )}

        {/* Habilidades */}
        {activeTab === 'habilidades' && (
          <div className="grid grid-cols-3 gap-3">
            <AttrCol items={g.talents}    label="Talentos"       characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <AttrCol items={g.skills}     label="Perícias"       characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <AttrCol items={g.knowledges} label="Conhecimentos"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
          </div>
        )}

        {/* Disciplinas / Antecedentes */}
        {activeTab === 'disciplinas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionDivider title="Disciplinas" />
                <div className="rounded px-3 py-1 min-h-[60px]"
                  style={{ background: 'rgba(157,90,245,0.04)', border: '1px solid rgba(157,90,245,0.2)' }}>
                  {g.resources.filter(a => a.attribute.description?.startsWith('Disciplina')).length === 0
                    ? <p className="text-[10px] text-saga-dim py-4 text-center italic">Nenhuma disciplina adicionada.</p>
                    : g.resources.filter(a => a.attribute.description?.startsWith('Disciplina'))
                        .map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} color={ACCENT} />)
                  }
                </div>
              </div>
              <div>
                <SectionDivider title="Antecedentes" />
                <div className="rounded px-3 py-1 min-h-[60px]"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {g.resources.filter(a => a.attribute.description?.startsWith('Antecedente')).length === 0
                    ? <p className="text-[10px] text-saga-dim py-4 text-center italic">Nenhum antecedente.</p>
                    : g.resources.filter(a => a.attribute.description?.startsWith('Antecedente'))
                        .map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} />)
                  }
                </div>
              </div>
            </div>
            {g.virtues.length > 0 && (
              <div>
                <SectionDivider title="Virtudes" />
                <div className="grid grid-cols-3 gap-2">
                  {g.virtues.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recursos */}
        {activeTab === 'recursos' && (
          <div className="space-y-4">
            {/* Geração + limites */}
            {genAttr && (
              <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">Geração</p>
                  <span className="font-cinzel font-bold" style={{ color: ACCENT }}>{genValue}ª</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-saga-dim">Reserva Máx. de Sangue</p>
                    <p className="text-saga-text font-cinzel">{limits.bloodPool}</p>
                  </div>
                  <div className="rounded p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-saga-dim">Trait Máximo</p>
                    <p className="text-saga-text font-cinzel">{limits.maxTrait}</p>
                  </div>
                </div>
              </div>
            )}

            <BloodpoolTrack attrs={attributes} characterId={characterId} canEdit={canEdit} onSaved={refresh} maxBlood={limits.bloodPool} />
            <WillpowerTrack attrs={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />

            {/* Humanidade */}
            {(() => {
              const humanity = attributes.find(a => a.attribute.name === 'Humanidade')
              if (!humanity) return null
              return (
                <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">Humanidade</p>
                    <span className="font-cinzel font-bold text-gold">{humanity.value} / 10</span>
                  </div>
                  <Dots value={humanity.value} max={10} editable={canEdit} attrId={humanity.id}
                    characterId={characterId} onSaved={refresh} />
                </div>
              )
            })()}

            <V20HealthTrack textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
          </div>
        )}

        {/* Personagem */}
        {activeTab === 'personagem' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ETF tfKey="clan"      label="Clã"            textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="concept"   label="Conceito"       textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="nature"    label="Natureza"       textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="demeanor"  label="Demeanor"       textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="path"      label="Caminho/Moralidade" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="xp_current" label="XP Atual"     textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="xp_total"  label="XP Gasto"      textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            </div>
            <ETF tfKey="disciplines_text" label="Disciplinas (lista)" textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="backgrounds_text" label="Antecedentes (lista)" textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="merits"    label="Méritos"    textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="flaws"     label="Defeitos"   textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
          </div>
        )}
      </div>
    </div>
  )
}
