'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

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

interface Weapon {
  id: string
  name: string
  attackBonus: string | null
  damage: string | null
  damageType: string | null
  range: string | null
  properties: string | null
  order: number
}

interface Props {
  characterId: string
  attributes: Attr[]
  textFields: TextField[]
  weapons: Weapon[]
  canEdit: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionDivider({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
      {action}
    </div>
  )
}

// ── Categorização de atributos VtM V5 ─────────────────────────────────────────

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const physSkills: Attr[] = [], socSkills: Attr[] = [], menSkills: Attr[] = []
  const disciplines: Attr[] = [], backgrounds: Attr[] = [], extra: Attr[] = []

  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    if      (d.startsWith('Físico'))             physical.push(a)
    else if (d.startsWith('Social'))             social.push(a)
    else if (d.startsWith('Mental'))             mental.push(a)
    else if (d.startsWith('Habilidade Física'))  physSkills.push(a)
    else if (d.startsWith('Habilidade Social'))  socSkills.push(a)
    else if (d.startsWith('Habilidade Mental'))  menSkills.push(a)
    else if (d.startsWith('Disciplina'))         disciplines.push(a)
    else if (d.startsWith('Antecedente'))        backgrounds.push(a)
    else                                         extra.push(a)
  }

  // Recursos especiais fora das categorias acima
  const recursos = extra.filter(a => ['Determinação', 'Humanidade', 'Blood Potency', 'Potência de Sangue', 'Compostura', 'Força de Vontade', 'Willpower'].some(n => a.attribute.name.includes(n)))
  const others = extra.filter(a => !recursos.includes(a))

  return { physical, social, mental, physSkills, socSkills, menSkills, disciplines, backgrounds, recursos, others }
}

// ── Dot display (WoD style) ───────────────────────────────────────────────────

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = '#c9a22a' }: {
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
            borderColor: i < value ? color : 'rgb(var(--ink) / 0.15)',
            cursor: editable ? 'pointer' : 'default',
          }} />
      ))}
    </div>
  )
}

// ── Dot attribute row ─────────────────────────────────────────────────────────

function DotRow({ attr, characterId, canEdit, onSaved, onDelete, max = 5, color }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void
  onDelete?: (id: string) => void; max?: number; color?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 group"
      style={{ borderColor: 'rgb(var(--ink) / 0.04)' }}>
      <div className="flex items-center gap-1.5 min-w-0">
        {canEdit && onDelete && (
          <button onClick={() => onDelete(attr.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-700/60 hover:text-red-700 flex-shrink-0">
            <X size={9} />
          </button>
        )}
        <span className="font-almendra text-[11px] text-ink truncate">{attr.attribute.name}</span>
      </div>
      <Dots value={attr.value} max={max} editable={canEdit} attrId={attr.id} characterId={characterId} onSaved={onSaved} color={color} />
    </div>
  )
}

// ── Column com atributos ──────────────────────────────────────────────────────

function AttrCol({ items, label, characterId, canEdit, onSaved, onDelete }: {
  items: Attr[]; label: string; characterId: string; canEdit: boolean; onSaved: () => void
  onDelete?: (id: string) => void
}) {
  return (
    <div>
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.15em] text-center mb-3 pb-2 border-b"
        style={{ borderColor: 'rgba(201,162,42,0.2)' }}>{label}</p>
      <div className="rounded px-3 py-1 min-h-[40px]"
        style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        {items.length === 0
          ? <p className="text-[10px] text-ink-soft py-4 text-center italic">—</p>
          : items.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />)
        }
      </div>
    </div>
  )
}

// ── Health track (superficial + agravado) ─────────────────────────────────────

type DamageType = 0 | 1 | 2  // 0=empty, 1=superficial, 2=aggravated

function HealthTrack({ tfKey, label, total, textFields, characterId, canEdit, onRefresh }: {
  tfKey: string; label: string; total: number; textFields: TextField[]
  characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)
  // Encode as comma-separated: "0,1,2,0,0,0,0"
  const raw = field?.value ?? ''
  const boxes: DamageType[] = raw
    ? raw.split(',').map(v => (Number(v) as DamageType))
    : Array(total).fill(0)
  while (boxes.length < total) boxes.push(0)

  async function cycleBox(i: number) {
    if (!canEdit) return
    const next = [...boxes]
    next[i] = next[i] === 0 ? 1 : next[i] === 1 ? 2 : 0
    const encoded = next.join(',')
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value: encoded }),
    }).catch(() => null)
    onRefresh()
  }

  const superficial = boxes.filter(b => b === 1).length
  const aggravated  = boxes.filter(b => b === 2).length

  return (
    <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">{label}</p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-amber-400">/ {superficial}</span>
          <span className="text-red-500">✗ {aggravated}</span>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {boxes.slice(0, total).map((dmg, i) => (
          <button key={i} onClick={() => void cycleBox(i)} disabled={!canEdit}
            title={dmg === 0 ? 'Ileso' : dmg === 1 ? 'Superficial (clique para Agravado)' : 'Agravado (clique para limpar)'}
            className="rounded border flex items-center justify-center transition-all flex-shrink-0"
            style={{
              width: 20, height: 20,
              background: dmg === 2 ? 'rgba(239,68,68,0.15)' : dmg === 1 ? 'rgba(251,191,36,0.08)' : 'transparent',
              borderColor: dmg === 2 ? '#ef4444' : dmg === 1 ? '#f59e0b' : 'rgb(var(--ink) / 0.2)',
              cursor: canEdit ? 'pointer' : 'default',
              fontSize: 10,
            }}>
            {dmg === 2 ? '✗' : dmg === 1 ? '/' : ''}
          </button>
        ))}
      </div>
      {canEdit && <p className="text-[9px] text-ink-soft/50 mt-2">Clique: vazio → superficial (/) → agravado (✗) → vazio</p>}
    </div>
  )
}

// ── Hunger track ──────────────────────────────────────────────────────────────

function HungerTrack({ attrs, characterId, canEdit, onSaved }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  const hunger = attrs.find(a => ['Fome', 'Hunger'].some(n => a.attribute.name.toLowerCase().includes(n.toLowerCase())))
  if (!hunger) return null

  return (
    <div className="rounded p-3" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-red-400">Fome</p>
        <span className="font-cinzel font-bold text-red-400">{hunger.value} / 5</span>
      </div>
      <Dots value={hunger.value} max={5} editable={canEdit} attrId={hunger.id}
        characterId={characterId} onSaved={onSaved} color="#ef4444" />
      <p className="text-[9px] text-red-400/50 mt-2">
        {hunger.value === 0 ? 'Alimentado' : hunger.value <= 2 ? 'Com Fome' : hunger.value <= 4 ? 'Faminto' : 'Esfomeado — Rouse obrigatório!'}
      </p>
    </div>
  )
}

// ── Willpower track ───────────────────────────────────────────────────────────

function WillpowerTrack({ attrs, textFields, characterId, canEdit, onSaved, onRefresh }: {
  attrs: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean
  onSaved: () => void; onRefresh: () => void
}) {
  const composura = attrs.find(a => a.attribute.name === 'Compostura')
  const determ    = attrs.find(a => a.attribute.name === 'Determinação' || a.attribute.name === 'Resolve')
  const totalWP   = (composura?.value ?? 0) + (determ?.value ?? 0)

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
    <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Força de Vontade</p>
        <span className="font-cinzel font-bold text-gold">{totalWP - used} / {totalWP}</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: totalWP }).map((_, i) => (
          <button key={i} onClick={() => void toggleWP(i)} disabled={!canEdit}
            className="rounded-full border transition-all flex-shrink-0"
            style={{
              width: 14, height: 14,
              background: i < (totalWP - used) ? '#c9a22a' : 'rgba(120,120,160,0.2)',
              borderColor: i < (totalWP - used) ? '#c9a22a' : 'rgba(120,120,160,0.4)',
              cursor: canEdit ? 'pointer' : 'default',
            }} />
        ))}
      </div>
      {totalWP === 0 && (
        <p className="text-[9px] text-ink-soft italic mt-1">Adicione Compostura e Determinação para calcular.</p>
      )}
    </div>
  )
}

// ── Campo de texto editável ───────────────────────────────────────────────────

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
    <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-2">{label}</p>
      {editing && canEdit ? (
        multiline
          ? <textarea autoFocus rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={() => void save()}
              className="w-full bg-parchment/60 border border-gold/40 rounded px-2 py-1.5 text-sm focus:outline-none resize-none" />
          : <input autoFocus type="text" value={val} onChange={e => setVal(e.target.value)}
              onBlur={() => void save()} onKeyDown={e => { if (e.key === 'Enter') void save() }}
              className="w-full bg-parchment/60 border border-gold/40 rounded px-2 py-1.5 text-sm focus:outline-none" />
      ) : (
        <div onClick={() => canEdit && setEditing(true)}
          className={`${canEdit ? 'cursor-pointer hover:bg-ink/[0.03]' : ''} rounded px-2 py-1 min-h-[28px] transition-colors`}>
          {field?.value
            ? <p className="text-sm text-ink whitespace-pre-wrap">{field.value}</p>
            : <p className="text-xs text-ink-soft italic">{canEdit ? 'Clique para editar…' : '—'}</p>
          }
        </div>
      )}
    </div>
  )
}

function NumericTextField({ tfKey, label, textFields, characterId, canEdit, onRefresh }: {
  tfKey: string; label: string; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)
  const [val, setVal] = useState(field?.value ?? '')
  async function save(v: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value: v }),
    }).catch(() => null)
    onRefresh()
  }
  return (
    <input type="number" min={0} max={5} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={e => void save(e.target.value)}
      disabled={!canEdit}
      className="w-20 bg-parchment/60 border border-gold/40 rounded px-2 py-1 text-sm focus:outline-none text-center" />
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'atributos',   label: 'Atributos' },
  { id: 'habilidades', label: 'Habilidades' },
  { id: 'disciplinas', label: 'Disciplinas' },
  { id: 'recursos',    label: 'Recursos' },
  { id: 'combate',     label: 'Combate' },
  { id: 'personagem',  label: 'Personagem' },
]

export function VtMV5Sheet({ characterId, attributes, textFields, weapons, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const g = categorize(attributes)

  function refresh() { router.refresh() }

  async function addWeapon(data: { name: string; attackBonus: string; damage: string; damageType: string; range: string }) {
    await fetch(`/api/characters/${characterId}/weapons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => null)
    router.refresh()
  }

  async function deleteWeapon(id: string) {
    await fetch(`/api/characters/${characterId}/weapons/${id}`, { method: 'DELETE' }).catch(() => null)
    router.refresh()
  }

  // Derive Stamina (Vigor) for health boxes
  const stamina = attributes.find(a => ['Vigor', 'Stamina'].some(n => a.attribute.name.includes(n)) && (a.attribute.description ?? '').startsWith('Físico'))
  const healthBoxes = 3 + (stamina?.value ?? 3)

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }}>

      {/* Tab bar */}
      <div className="flex flex-wrap border-b" style={{ borderColor: 'rgb(var(--ink) / 0.14)', background: 'rgb(var(--ink) / 0.05)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? '#9d5af5' : 'rgb(var(--ink-soft))', background: isActive ? 'rgba(157,90,245,0.05)' : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: 'linear-gradient(90deg, transparent, #9d5af5, transparent)' }} />}
            </button>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">

        {/* Atributos — 3×3 grade */}
        {activeTab === 'atributos' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <AttrCol items={g.physical} label="Físico"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
              <AttrCol items={g.social}   label="Social"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
              <AttrCol items={g.mental}   label="Mental"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            </div>
            {g.others.length > 0 && (
              <div>
                <SectionDivider title="Outros" />
                {g.others.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} />)}
              </div>
            )}
          </div>
        )}

        {/* Habilidades — 3×3 */}
        {activeTab === 'habilidades' && (
          <div className="grid grid-cols-3 gap-3">
            <AttrCol items={g.physSkills} label="Físicas"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <AttrCol items={g.socSkills}  label="Sociais"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <AttrCol items={g.menSkills}  label="Mentais"  characterId={characterId} canEdit={canEdit} onSaved={refresh} />
          </div>
        )}

        {/* Disciplinas + Antecedentes */}
        {activeTab === 'disciplinas' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionDivider title="Disciplinas" />
              <div className="rounded px-3 py-1 min-h-[60px]"
                style={{ background: 'rgba(157,90,245,0.04)', border: '1px solid rgba(157,90,245,0.2)' }}>
                {g.disciplines.length === 0
                  ? <p className="text-[10px] text-ink-soft py-4 text-center italic">Nenhuma disciplina adicionada.</p>
                  : g.disciplines.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} color="#9d5af5" />)
                }
              </div>
            </div>
            <div>
              <SectionDivider title="Antecedentes" />
              <div className="rounded px-3 py-1 min-h-[60px]"
                style={{ background: 'rgb(var(--ink) / 0.02)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
                {g.backgrounds.length === 0
                  ? <p className="text-[10px] text-ink-soft py-4 text-center italic">Nenhum antecedente.</p>
                  : g.backgrounds.map(a => <DotRow key={a.id} attr={a} characterId={characterId} canEdit={canEdit} onSaved={refresh} />)
                }
              </div>
            </div>
          </div>
        )}

        {/* Recursos — Fome, Willpower, Humanidade, Blood Potency */}
        {activeTab === 'recursos' && (
          <div className="space-y-4">
            <HungerTrack attrs={attributes} characterId={characterId} canEdit={canEdit} onSaved={refresh} />
            <WillpowerTrack attrs={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onSaved={refresh} onRefresh={refresh} />

            {/* Humanidade */}
            {(() => {
              const humanity = attributes.find(a => a.attribute.name === 'Humanidade' || a.attribute.name === 'Humanity')
              if (!humanity) return null
              return (
                <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Humanidade</p>
                    <span className="font-cinzel font-bold text-gold">{humanity.value} / 10</span>
                  </div>
                  <Dots value={humanity.value} max={10} editable={canEdit} attrId={humanity.id} characterId={characterId} onSaved={refresh} />
                </div>
              )
            })()}

            {/* Blood Potency — tabela completa */}
            {(() => {
              const bp = attributes.find(a => a.attribute.name.toLowerCase().includes('blood potency') || a.attribute.name.toLowerCase().includes('potência de sangue'))
              if (!bp) return null
              // Indexed by BP value (0-10)
              const TABLE: Array<{ surge: string; mend: string; power: string; feeding: string; bane: number; rouse: string }> = [
                { surge: '+1 dado',  mend: '1 Sup',  power: '—',  feeding: 'Nenhuma',           bane: 1, rouse: 'Nunca'       },
                { surge: '+1 dado',  mend: '1 Sup',  power: '—',  feeding: 'Sangue-ralo',        bane: 1, rouse: 'Nunca'       },
                { surge: '+1 dado',  mend: '1 Sup',  power: '+1', feeding: 'Animais',             bane: 2, rouse: 'Nenhum'      },
                { surge: '+1 dado',  mend: '2 Sup',  power: '+1', feeding: 'Animal somente',      bane: 3, rouse: 'Nenhum'      },
                { surge: '+2 dados', mend: '2 Sup',  power: '+2', feeding: 'Animal somente',      bane: 3, rouse: 'Fome 1'      },
                { surge: '+2 dados', mend: '2 Sup',  power: '+2', feeding: 'Mortal somente',      bane: 4, rouse: 'Fome 1'      },
                { surge: '+3 dados', mend: '3 Sup',  power: '+3', feeding: 'Mortal somente',      bane: 4, rouse: 'Fome 1-2'    },
                { surge: '+3 dados', mend: '3 Sup',  power: '+3', feeding: 'Sangue ensacado',     bane: 5, rouse: 'Fome 1-2'    },
                { surge: '+3 dados', mend: '3 Sup',  power: '+4', feeding: 'Sangue ensacado',     bane: 5, rouse: 'Fome 1-3'    },
                { surge: '+4 dados', mend: '3 Sup',  power: '+4', feeding: 'Sangue ensacado',     bane: 6, rouse: 'Fome 1-3'    },
                { surge: '+4 dados', mend: '3 Sup',  power: '+5', feeding: 'Sangue de vampiro',   bane: 6, rouse: 'Fome 1-5'    },
              ]
              const row = TABLE[bp.value] ?? TABLE[10]!
              return (
                <div className="rounded p-3" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Blood Potency</p>
                    <span className="font-cinzel font-bold text-red-400">{bp.value}</span>
                  </div>
                  <Dots value={bp.value} max={10} editable={canEdit} attrId={bp.id} characterId={characterId} onSaved={refresh} color="#ef4444" />
                  {bp.value > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                        {[
                          ['Blood Surge', row.surge],
                          ['Curar (Rouse)', row.mend],
                          ['Bônus de Poder', row.power],
                          ['Penalidade Alim.', row.feeding],
                          ['Severidade Bane', String(row.bane)],
                          ['Rouse Re-roll', row.rouse],
                        ].map(([label, val]) => (
                          <div key={label} className="rounded px-2 py-1.5" style={{ background: 'rgb(var(--ink) / 0.08)' }}>
                            <div className="text-[8px] text-ink-soft uppercase tracking-wider">{label}</div>
                            <div className="text-[11px] font-bold text-red-300 mt-0.5">{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Convicções e Tocadores */}
            <ETF tfKey="convictions" label="Convicções" textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="touchstones" label="Tocadores"  textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="tenets"      label="Preceitos da Crônica" textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />

            {/* Ressonância / Hunting */}
            {(() => {
              const resonanceAttr = attributes.find(a =>
                a.attribute.name.toLowerCase().includes('ressonância') ||
                a.attribute.name.toLowerCase().includes('resonância') ||
                a.attribute.name.toLowerCase().includes('resonance')
              )
              const RESONANCE_TYPES = ['Sanguíneo', 'Colérico', 'Melancólico', 'Fleumático', 'Nervoso', 'Sem Ressonância']
              return (
                <div className="rounded p-3 space-y-3" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
                  <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Ressonância & Caça</p>
                  {resonanceAttr && (
                    <div>
                      <p className="text-[9px] text-ink-soft mb-2">Intensidade (1–5)</p>
                      <Dots value={resonanceAttr.value} max={5} editable={canEdit} attrId={resonanceAttr.id} characterId={characterId} onSaved={refresh} color="#dc2626" />
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-ink-soft mb-1.5">Tipo Emocional</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RESONANCE_TYPES.map(type => {
                        const tf = textFields.find(f => f.key === 'resonance_type')
                        const active = tf?.value === type
                        return (
                          <button key={type} type="button" disabled={!canEdit}
                            onClick={async () => {
                              await fetch(`/api/characters/${characterId}/text-fields`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ key: 'resonance_type', label: 'Tipo de Ressonância', value: type }),
                              }).catch(() => null)
                              refresh()
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                            style={{
                              background: active ? 'rgba(220,38,38,0.2)' : 'rgb(var(--ink) / 0.04)',
                              border: `1px solid ${active ? 'rgba(220,38,38,0.5)' : 'rgb(var(--ink) / 0.08)'}`,
                              color: active ? '#fca5a5' : 'rgb(var(--ink-soft))',
                            }}>
                            {type}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <ETF tfKey="hunting_notes" label="Notas de Caça" textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
                </div>
              )
            })()}
          </div>
        )}

        {/* Combate — Saúde (dual damage) + Armas */}
        {activeTab === 'combate' && (
          <div className="space-y-5">
            <HealthTrack tfKey="healthDamage" label="Trilha de Saúde" total={healthBoxes}
              textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />

            {/* Weapons */}
            <SectionDivider title="Ataques" />
            {weapons.length === 0 && (
              <p className="text-xs text-ink-soft text-center py-3 italic">
                {canEdit ? 'Nenhum ataque. Use o botão abaixo.' : 'Nenhum ataque cadastrado.'}
              </p>
            )}
            {weapons.map(w => (
              <div key={w.id} className="flex items-center gap-3 py-2 px-3 rounded group hover:bg-ink/[0.03] transition-all">
                <span className="flex-1 text-sm font-medium">{w.name}</span>
                <span className="text-sm font-cinzel text-gold">{w.attackBonus ?? '—'}</span>
                <span className="text-sm font-mono">{w.damage ?? '—'}</span>
                {canEdit && (
                  <button onClick={() => void deleteWeapon(w.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-700/60 hover:text-red-700">
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Personagem */}
        {activeTab === 'personagem' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ETF tfKey="clan"      label="Clã"      textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="generation" label="Geração"  textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="predator"  label="Tipo de Predador" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <ETF tfKey="concept"   label="Conceito"  textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            </div>
            <ETF tfKey="ambition"  label="Ambição"   textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            <ETF tfKey="desire"    label="Desejo"    textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
            {/* Haven */}
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgb(var(--ink) / 0.025)', border: '1px solid rgb(var(--ink) / 0.14)' }}>
              <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Haven</p>
              <ETF tfKey="haven_location" label="Localização" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Rating (1-5)</label>
                {(() => {
                  const havenAttr = attributes.find(a => a.attribute.name.toLowerCase().includes('haven'))
                  if (havenAttr) return <Dots value={havenAttr.value} max={5} editable={canEdit} attrId={havenAttr.id} characterId={characterId} onSaved={refresh} />
                  return <NumericTextField tfKey="haven_rating" label="Haven Rating" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
                })()}
              </div>
            </div>
            <ETF tfKey="backstory" label="História"  textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
            <ETF tfKey="notes"     label="Notas"     textFields={textFields} characterId={characterId} canEdit={canEdit} multiline onRefresh={refresh} />
          </div>
        )}
      </div>
    </div>
  )
}
