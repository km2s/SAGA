'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; canEdit: boolean }

const ACCENT = '#7c1818'
const RED = '#dc2626'

// ── Disciplinas por Clã (V20) ──────────────────────────────────────────────────
const CLAN_DISCIPLINES: Record<string, string[]> = {
  // Camarilla
  'Brujah':    ['Celeridade', 'Potência', 'Presença'],
  'Gangrel':   ['Animalismo', 'Fortitude', 'Proteísmo'],
  'Malkavian': ['Auspex', 'Demência', 'Ofuscação'],
  'Nosferatu': ['Animalismo', 'Ofuscação', 'Potência'],
  'Toreador':  ['Auspex', 'Celeridade', 'Presença'],
  'Tremere':   ['Auspex', 'Dominação', 'Taumaturgia'],
  'Ventrue':   ['Dominação', 'Fortitude', 'Presença'],
  // Sabbat
  'Lasombra':  ['Dominação', 'Obtenebridade', 'Potência'],
  'Tzimisce':  ['Animalismo', 'Auspex', 'Vicissitude'],
  // Independentes
  'Assamita':  ['Celeridade', 'Ofuscação', 'Quietus'],
  'Seguidor de Set': ['Ofuscação', 'Presença', 'Serpentis'],
  'Giovanni':  ['Dominação', 'Necromancia', 'Potência'],
  'Ravnos':    ['Animalismo', 'Fortitude', 'Quimerismo'],
  // Camarilla antigos
  'Caitiff':   [],
  'Baali':     ['Demonismo', 'Ofuscação', 'Presença'],
  // Variações comuns de nome
  'Malkaviano':   ['Auspex', 'Demência', 'Ofuscação'],
  'Nosferatu (Clã)': ['Animalismo', 'Ofuscação', 'Potência'],
  'Toreador (Clã)':  ['Auspex', 'Celeridade', 'Presença'],
}

// Todas as disciplinas disponíveis para o seletor manual
const ALL_DISCIPLINES = [
  'Animalismo', 'Auspex', 'Celeridade', 'Demência', 'Demonismo',
  'Dominação', 'Fortitude', 'Necromancia', 'Obtenebridade', 'Ofuscação',
  'Potência', 'Presença', 'Proteísmo', 'Quimerismo', 'Quietus',
  'Sanguis', 'Serpentis', 'Taumaturgia', 'Vicissitude',
]

// Antecedentes padrão V20
const DEFAULT_BACKGROUNDS = [
  'Aliados', 'Contatos', 'Domínio', 'Fama', 'Geração', 'Gregge',
  'Influência', 'Mentor', 'Recursos', 'Rebanho', 'Retainers', 'Status',
]

// ── Utilitários ────────────────────────────────────────────────────────────────

function normalizeClan(raw: string): string {
  return raw.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function getDisciplinesForClan(clanRaw: string): string[] {
  for (const [key, discs] of Object.entries(CLAN_DISCIPLINES)) {
    const norm = normalizeClan(key)
    if (normalizeClan(clanRaw).includes(norm) || norm.includes(normalizeClan(clanRaw))) {
      return discs
    }
  }
  return []
}

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const virtues: Attr[] = [], other: Attr[] = []
  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    if      (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else if (d.startsWith('Virtude'))      virtues.push(a)
    else                                   other.push(a)
  }
  return { physical, social, mental, talents, skills, knowledges, virtues, other }
}

// ── Componentes ────────────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
    </div>
  )
}

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = RED }: {
  value: number; max?: number; editable?: boolean
  attrId?: string; characterId?: string; onSaved?: () => void; color?: string
}) {
  async function handleClick(i: number) {
    if (!editable || !attrId || !characterId || !onSaved) return
    const newVal = i + 1 === value ? i : i + 1
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newVal }),
    }).catch(() => null)
    onSaved()
  }
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button key={i} type="button" onClick={() => void handleClick(i)}
          className={`w-3 h-3 rounded-full border transition-colors ${editable ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ background: i < value ? color : 'transparent', borderColor: color }} />
      ))}
    </div>
  )
}

function AttrRow({ a, characterId, canEdit, onSaved }: { a: Attr; characterId: string; canEdit: boolean; onSaved: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
      <span className="text-sm text-ink-soft">{a.attribute.name}</span>
      <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onSaved} />
    </div>
  )
}

function TFField({ characterId, textFields, tfKey, label, placeholder, multiline = false, canEdit, onRefresh }: {
  characterId: string; textFields: TextField[]; tfKey: string; label: string; placeholder?: string; multiline?: boolean; canEdit: boolean; onRefresh: () => void
}) {
  const existing = textFields.find(f => f.key === tfKey)
  const [val, setVal] = useState(existing?.value ?? '')
  const [saving, setSaving] = useState(false)
  async function save(newVal: string) {
    setSaving(true)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value: newVal }),
    }).catch(() => null)
    setSaving(false); onRefresh()
  }
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-red-900/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

// Discipline row com dots de 0-5 salvo em text-fields (chave: disc_{nome normalizado})
function DisciplineRow({ name, characterId, textFields, canEdit, onRefresh, removable, onRemove }: {
  name: string; characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void
  removable?: boolean; onRemove?: () => void
}) {
  const key = `disc_${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}`
  const existing = textFields.find(f => f.key === key)
  const [value, setValue] = useState(Number(existing?.value ?? 0))

  async function setDot(i: number) {
    if (!canEdit) return
    const newVal = i + 1 === value ? i : i + 1
    setValue(newVal)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label: `Disciplina: ${name}`, value: String(newVal) }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-ink/10 last:border-0 group">
      <span className="text-sm text-ink-soft">{name}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} type="button" onClick={() => void setDot(i)}
              className={`w-3 h-3 rounded-full border transition-colors ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ background: i < value ? RED : 'transparent', borderColor: RED }} />
          ))}
        </div>
        {removable && canEdit && (
          <button type="button" onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-300 transition-all ml-1"><X size={11} /></button>
        )}
      </div>
    </div>
  )
}

// Background row salvo em text-fields (chave: bg_{nome})
function BackgroundRow({ name, characterId, textFields, canEdit, onRefresh, removable, onRemove }: {
  name: string; characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void
  removable?: boolean; onRemove?: () => void
}) {
  const key = `bg_${name.toLowerCase().replace(/\s+/g, '_')}`
  const existing = textFields.find(f => f.key === key)
  const [value, setValue] = useState(Number(existing?.value ?? 0))

  async function setDot(i: number) {
    if (!canEdit) return
    const newVal = i + 1 === value ? i : i + 1
    setValue(newVal)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label: `Antecedente: ${name}`, value: String(newVal) }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-ink/10 last:border-0 group">
      <span className="text-sm text-ink-soft">{name}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} type="button" onClick={() => void setDot(i)}
              className={`w-3 h-3 rounded-full border transition-colors ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ background: i < value ? '#b45309' : 'transparent', borderColor: '#b45309' }} />
          ))}
        </div>
        {removable && canEdit && (
          <button type="button" onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-500 hover:text-amber-300 transition-all ml-1"><X size={11} /></button>
        )}
      </div>
    </div>
  )
}

function HealthTrack({ characterId, textFields, canEdit, onRefresh }: { characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void }) {
  const existing = textFields.find(f => f.key === 'healthTrack')?.value ?? '00000000'
  const [track, setTrack] = useState(existing.split('').map(Number))
  const LEVELS = [
    'Contundido (0)', 'Machucado (−1)', 'Ferido (−1)',
    'Lacerado (−2)', 'Mutilado (−2)', 'Aleijado (−5)', 'Incapacitado',
  ]
  async function toggle(i: number) {
    if (!canEdit) return
    const next = [...track]; next[i] = next[i] ? 0 : 1
    setTrack(next)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'healthTrack', label: 'Saúde', value: next.join('') }),
    }).catch(() => null)
    onRefresh()
  }
  return (
    <div className="space-y-1.5">
      {LEVELS.map((lbl, i) => (
        <div key={i} className="flex items-center gap-3">
          <button type="button" onClick={() => void toggle(i)} disabled={!canEdit}
            className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${track[i] ? 'bg-red-800' : 'bg-transparent'}`}
            style={{ borderColor: RED }} />
          <span className="text-[11px] text-ink-soft">{lbl}</span>
        </div>
      ))}
    </div>
  )
}

const GEN_TABLE: Record<number, [number, number, number]> = {
  3: [100, 10, 10], 4: [50, 9, 8], 5: [40, 8, 6],
  6: [30, 7, 4], 7: [20, 6, 3], 8: [15, 5, 2],
  9: [14, 5, 2], 10: [13, 5, 1], 11: [12, 4, 1],
  12: [11, 3, 1], 13: [10, 3, 1], 15: [10, 3, 1],
}

// ── Sheet principal ────────────────────────────────────────────────────────────

export function VtMV20Sheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'vantagens' | 'recursos' | 'personagem'>('atributos')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const onRefresh = () => router.refresh()

  async function deleteAttr(id: string) {
    setDeleteTarget(null)
    await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charAttributeId: id }),
    }).catch(() => null)
    onRefresh()
  }

  const { physical, social, mental, talents, skills, knowledges, virtues, other } = categorize(attributes)

  // Clã atual (salvo no text-field 'clan')
  const clanValue = textFields.find(f => f.key === 'clan')?.value ?? ''
  const clanDisciplines = getDisciplinesForClan(clanValue)

  // Disciplinas extras adicionadas manualmente (salvas como 'extra_disc_list')
  const extraDiscRaw = textFields.find(f => f.key === 'extra_disc_list')?.value ?? ''
  const [extraDiscs, setExtraDiscs] = useState<string[]>(
    extraDiscRaw ? extraDiscRaw.split('|').filter(Boolean) : []
  )
  const [showDiscPicker, setShowDiscPicker] = useState(false)

  async function addExtraDisc(disc: string) {
    if (clanDisciplines.includes(disc) || extraDiscs.includes(disc)) return
    const next = [...extraDiscs, disc]
    setExtraDiscs(next)
    setShowDiscPicker(false)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'extra_disc_list', label: 'Disciplinas Extras', value: next.join('|') }),
    }).catch(() => null)
    onRefresh()
  }

  async function removeExtraDisc(disc: string) {
    const next = extraDiscs.filter(d => d !== disc)
    setExtraDiscs(next)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'extra_disc_list', label: 'Disciplinas Extras', value: next.join('|') }),
    }).catch(() => null)
    onRefresh()
  }

  // Antecedentes extras adicionados manualmente
  const extraBgRaw = textFields.find(f => f.key === 'extra_bg_list')?.value ?? ''
  const [extraBgs, setExtraBgs] = useState<string[]>(
    extraBgRaw ? extraBgRaw.split('|').filter(Boolean) : []
  )
  const [newBgInput, setNewBgInput] = useState('')
  const [showBgInput, setShowBgInput] = useState(false)

  async function addExtraBg(name: string) {
    if (!name.trim() || DEFAULT_BACKGROUNDS.includes(name) || extraBgs.includes(name)) return
    const next = [...extraBgs, name.trim()]
    setExtraBgs(next)
    setNewBgInput('')
    setShowBgInput(false)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'extra_bg_list', label: 'Antecedentes Extras', value: next.join('|') }),
    }).catch(() => null)
    onRefresh()
  }

  async function removeExtraBg(name: string) {
    const next = extraBgs.filter(b => b !== name)
    setExtraBgs(next)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'extra_bg_list', label: 'Antecedentes Extras', value: next.join('|') }),
    }).catch(() => null)
    onRefresh()
  }

  const genAttr = attributes.find(a => a.attribute.name.toLowerCase().includes('geração') || a.attribute.name.toLowerCase().includes('generation'))
  const genNum = genAttr?.value ?? 13
  const genRow = GEN_TABLE[genNum]

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }
  const tabs = [
    { id: 'atributos',   label: 'Atributos' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'vantagens',   label: 'Vantagens' },
    { id: 'recursos',    label: 'Recursos' },
    { id: 'personagem',  label: 'Personagem' },
  ] as const

  // Disciplinas a exibir: clã + extras
  const allDiscsToShow = [
    ...clanDisciplines,
    ...extraDiscs.filter(d => !clanDisciplines.includes(d)),
  ]
  // Disciplinas disponíveis para adicionar (não inclui já adicionadas)
  const availableDiscs = ALL_DISCIPLINES.filter(d => !allDiscsToShow.includes(d))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${ACCENT}40`, border: `1px solid ${RED}40` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: RED }} />
        <span className="font-cinzel text-sm font-bold" style={{ color: RED }}>Vampire: The Masquerade V20</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgb(var(--ink) / 0.08)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: RED, color: '#fff' } : { color: 'rgb(var(--ink) / 0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Atributos ── */}
      {tab === 'atributos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Físico', physical], ['Social', social], ['Mental', mental]].map(([title, list]) => (
            <div key={String(title)} className={card} style={cardStyle}>
              <SectionDivider title={String(title)} />
              {(list as Attr[]).length === 0
                ? <p className="text-[11px] text-ink-soft italic">Nenhum atributo encontrado</p>
                : (list as Attr[]).map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)
              }
            </div>
          ))}
        </div>
      )}

      {/* ── Habilidades ── */}
      {tab === 'habilidades' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Talentos', talents], ['Perícias', skills], ['Conhecimentos', knowledges]].map(([title, list]) => (
            <div key={String(title)} className={card} style={cardStyle}>
              <SectionDivider title={String(title)} />
              {(list as Attr[]).length === 0
                ? <p className="text-[11px] text-ink-soft italic">Nenhuma habilidade encontrada</p>
                : (list as Attr[]).map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)
              }
            </div>
          ))}
        </div>
      )}

      {/* ── Vantagens ── */}
      {tab === 'vantagens' && (
        <div className="space-y-4">

          {/* Disciplinas */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Disciplinas" />

            {clanValue && clanDisciplines.length > 0 && (
              <p className="text-[10px] text-ink-soft mb-3 italic">
                Disciplinas do clã <span className="text-amber-400 font-bold not-italic">{clanValue}</span> preenchidas automaticamente.
              </p>
            )}
            {!clanValue && (
              <p className="text-[10px] text-amber-500/70 mb-3 italic">
                Defina o Clã na aba Personagem para ver as disciplinas do clã automaticamente.
              </p>
            )}
            {clanValue && clanDisciplines.length === 0 && (
              <p className="text-[10px] text-ink-soft mb-3 italic">
                Clã não reconhecido ou sem disciplinas mapeadas. Adicione manualmente abaixo.
              </p>
            )}

            {/* Disciplinas do clã */}
            {clanDisciplines.map(disc => (
              <DisciplineRow key={disc} name={disc} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
            ))}

            {/* Disciplinas extras */}
            {extraDiscs.filter(d => !clanDisciplines.includes(d)).map(disc => (
              <DisciplineRow key={disc} name={disc} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh}
                removable onRemove={() => void removeExtraDisc(disc)} />
            ))}

            {/* Botão adicionar disciplina */}
            {canEdit && (
              <div className="mt-3 relative">
                {showDiscPicker ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      {availableDiscs.map(d => (
                        <button key={d} type="button" onClick={() => void addExtraDisc(d)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold transition-all hover:opacity-80"
                          style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
                          + {d}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setShowDiscPicker(false)}
                      className="text-[10px] text-ink-soft hover:text-ink-soft mt-1">Cancelar</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowDiscPicker(true)}
                    className="text-[10px] font-bold transition-all hover:opacity-80 px-3 py-1 rounded"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#fca5a5' }}>
                    + Adicionar Disciplina
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Antecedentes */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Antecedentes" />
            {DEFAULT_BACKGROUNDS.map(bg => (
              <BackgroundRow key={bg} name={bg} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
            ))}
            {extraBgs.map(bg => (
              <BackgroundRow key={bg} name={bg} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh}
                removable onRemove={() => void removeExtraBg(bg)} />
            ))}
            {canEdit && (
              <div className="mt-3">
                {showBgInput ? (
                  <div className="flex gap-2 items-center">
                    <input type="text" value={newBgInput} onChange={e => setNewBgInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void addExtraBg(newBgInput); if (e.key === 'Escape') setShowBgInput(false) }}
                      placeholder="Nome do antecedente..."
                      className="flex-1 bg-parchment/40 border border-ink/15 rounded px-2 py-1 text-xs text-ink-soft focus:outline-none focus:border-amber-700/40" />
                    <button type="button" onClick={() => void addExtraBg(newBgInput)}
                      className="text-[10px] font-bold px-2 py-1 rounded transition-all hover:opacity-80"
                      style={{ background: 'rgba(180,83,9,0.2)', border: '1px solid rgba(180,83,9,0.3)', color: '#fcd34d' }}>
                      Adicionar
                    </button>
                    <button type="button" onClick={() => setShowBgInput(false)} className="text-[10px] text-ink-soft hover:text-ink-soft"><X size={11} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowBgInput(true)}
                    className="text-[10px] font-bold transition-all hover:opacity-80 px-3 py-1 rounded"
                    style={{ background: 'rgba(180,83,9,0.1)', border: '1px solid rgba(180,83,9,0.2)', color: '#fcd34d' }}>
                    + Adicionar Antecedente
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Virtudes — lógica automática baseada em Humanidade/Via */}
          {(() => {
            // Detectar se o vampiro segue Humanidade ou uma Via de Iluminação
            // Regras V20 p.312-315:
            // - Humanidade → Consciência + Autocontrole + Coragem
            // - Via de Iluminação → substitui Consciência por Convicção e/ou Autocontrole por Instinto
            // - Requisito para mudar de Via: Humanidade ≤ 3 (V20 p.315)
            // - Geração não determina Convicção por si só; é a Via que troca as virtudes
            const moralityTF = textFields.find(f => f.key === 'humanity')
            const moralityVal = moralityTF?.value?.trim() ?? ''
            // Se o campo contém um número ≤ 3 ou o nome de uma Via (não é "Humanidade" nem vazio)
            const isOnPath = moralityVal !== '' &&
              moralityVal.toLowerCase() !== 'humanidade' &&
              (isNaN(Number(moralityVal)) || Number(moralityVal) <= 3)
            const isNumericLow = !isNaN(Number(moralityVal)) && Number(moralityVal) <= 3 && moralityVal !== ''
            const isNamedPath = moralityVal !== '' && isNaN(Number(moralityVal)) && moralityVal.toLowerCase() !== 'humanidade'

            // Detectar qual combinação de virtudes a Via usa
            // Via nomeada → verificar se tem "Convicção" ou "Instinto" nos text-fields de preferência da Via
            const pathVirtueOverrideTF = textFields.find(f => f.key === 'path_virtue_override')
            const override = pathVirtueOverrideTF?.value ?? 'none' // 'none' | 'conviction' | 'instinct' | 'both'

            const useConviction = isNamedPath && (override === 'conviction' || override === 'both')
            const useInstinct   = isNamedPath && (override === 'instinct'   || override === 'both')

            const conscienceAttr = virtues.find(a => a.attribute.name.toLowerCase().includes('consciência') || a.attribute.name.toLowerCase().includes('conscience'))
            const selfCtrlAttr   = virtues.find(a => a.attribute.name.toLowerCase().includes('autocontrole') || a.attribute.name.toLowerCase().includes('self-control'))
            const courageAttr    = virtues.find(a => a.attribute.name.toLowerCase().includes('coragem') || a.attribute.name.toLowerCase().includes('courage'))

            const virtueRows = [
              { label: useConviction ? 'Convicção' : 'Consciência',    attr: conscienceAttr,
                tooltip: useConviction
                  ? 'Convicção — capacidade de justificar ações segundo o código da Via (substitui Consciência)'
                  : 'Consciência — arrependimento moral; governa o risco de perder Humanidade' },
              { label: useInstinct ? 'Instinto' : 'Autocontrole',       attr: selfCtrlAttr,
                tooltip: useInstinct
                  ? 'Instinto — abraçar a Besta para resistir ao frenesi (substitui Autocontrole)'
                  : 'Autocontrole — resistir ao frenesi quando provocado; rolar para evitar ceder à Besta' },
              { label: 'Coragem',                                         attr: courageAttr,
                tooltip: 'Coragem — enfrentar Rötschreck (medo de fogo/luz solar) e situações aterrorizantes' },
            ]

            return (
              <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
                <SectionDivider title="Virtudes" />

                {/* Banner de estado moral */}
                {isNamedPath ? (
                  <div className="rounded px-3 py-2 text-[10px]" style={{ background: 'rgba(120,20,20,0.25)', border: '1px solid rgba(220,38,38,0.3)' }}>
                    <span className="font-bold text-red-300">Via de Iluminação: </span>
                    <span className="text-ink-soft">{moralityVal}</span>
                    <span className="text-red-400/60 ml-2">— virtudes podem diferir da Humanidade</span>
                  </div>
                ) : isNumericLow ? (
                  <div className="rounded px-3 py-2 text-[10px]" style={{ background: 'rgba(120,80,0,0.2)', border: '1px solid rgba(200,130,0,0.3)' }}>
                    <span className="font-bold text-amber-400">Humanidade {moralityVal} </span>
                    <span className="text-ink-soft">— nível crítico; elegível para adotar uma Via de Iluminação (V20 p.315)</span>
                  </div>
                ) : (
                  <div className="rounded px-3 py-2 text-[10px]" style={{ background: 'rgba(20,40,20,0.3)', border: '1px solid rgba(60,120,60,0.25)' }}>
                    <span className="font-bold text-green-400">Humanidade </span>
                    <span className="text-ink-soft">— virtudes padrão: Consciência · Autocontrole · Coragem</span>
                  </div>
                )}

                {/* Seletor de virtudes alternativas (só aparece em Via nomeada) */}
                {isNamedPath && canEdit && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-ink-soft uppercase tracking-wider">Virtudes alternativas desta Via</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { val: 'none',       label: 'Consciência + Autocontrole' },
                        { val: 'conviction', label: 'Convicção + Autocontrole' },
                        { val: 'instinct',   label: 'Consciência + Instinto' },
                        { val: 'both',       label: 'Convicção + Instinto' },
                      ].map(opt => (
                        <button key={opt.val} type="button"
                          onClick={async () => {
                            await fetch(`/api/characters/${characterId}/text-fields`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'path_virtue_override', label: 'Virtudes da Via', value: opt.val }),
                            }).catch(() => null)
                            onRefresh()
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                          style={{
                            background: override === opt.val ? 'rgba(220,38,38,0.2)' : 'rgb(var(--ink) / 0.04)',
                            border: `1px solid ${override === opt.val ? 'rgba(220,38,38,0.5)' : 'rgb(var(--ink) / 0.08)'}`,
                            color: override === opt.val ? '#fca5a5' : 'rgb(var(--ink-soft))',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linhas de virtude */}
                <div className="space-y-0">
                  {virtueRows.map(({ label, attr, tooltip }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-ink/10 last:border-0" title={tooltip}>
                      <div>
                        <span className="text-sm text-ink-soft">{label}</span>
                        <span className="text-[9px] text-ink-soft/60 ml-1.5">{tooltip.split('—')[1]?.trim().slice(0, 45)}…</span>
                      </div>
                      {attr
                        ? <Dots value={attr.value} max={5} editable={canEdit} attrId={attr.id} characterId={characterId} onSaved={onRefresh} />
                        : <span className="text-[10px] text-ink-soft italic">não encontrada</span>
                      }
                    </div>
                  ))}
                </div>

                {/* Nota de regra */}
                <p className="text-[9px] text-ink-soft/50 italic">
                  {isNamedPath
                    ? 'V20 p.312–315: Vias substituem virtudes. Convicção ↔ Consciência; Instinto ↔ Autocontrole.'
                    : 'V20 p.289: Consciência + Autocontrole = Humanidade inicial. Coragem = Força de Vontade inicial.'
                  }
                </p>
              </div>
            )
          })()}

          {/* Outros (Força de Vontade, Humanidade, Sangue — atributos numéricos) */}
          {other.filter(a => !a.attribute.name.toLowerCase().includes('geração') && !a.attribute.name.toLowerCase().includes('generation')).length > 0 && (
            <div className={card} style={cardStyle}>
              <SectionDivider title="Recursos" />
              {other
                .filter(a => !a.attribute.name.toLowerCase().includes('geração') && !a.attribute.name.toLowerCase().includes('generation'))
                .map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)
              }
            </div>
          )}
        </div>
      )}

      {/* ── Recursos ── */}
      {tab === 'recursos' && (
        <div className="space-y-4">
          {/* Geração */}
          {genAttr && (
            <div className={card} style={cardStyle}>
              <SectionDivider title="Geração" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-ink-soft">Geração</span>
                <div className="flex items-center gap-2">
                  <Dots value={genAttr.value} max={15} editable={canEdit} attrId={genAttr.id} characterId={characterId} onSaved={onRefresh} color={RED} />
                  <span className="font-cinzel font-bold text-red-400 text-sm ml-2">{genAttr.value}ª</span>
                </div>
              </div>
              {genRow && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[['Pool Máx.', genRow[0]], ['Traço Máx.', genRow[1]], ['Sangue/Round', genRow[2]]].map(([lbl, v]) => (
                    <div key={String(lbl)} className="rounded p-2" style={{ background: 'rgb(var(--ink) / 0.08)' }}>
                      <div className="text-[8px] text-ink-soft uppercase tracking-wider">{lbl}</div>
                      <div className="text-sm font-bold text-red-300 mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Saúde */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Saúde" />
            <HealthTrack characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
          </div>

          {/* Pool de Sangue, Força de Vontade, Humanidade */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Pool de Sangue / Força de Vontade / Humanidade" />
            <div className="space-y-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="blood_current" label="Pool de Sangue (atual)" placeholder="10" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="willpower_current" label="Força de Vontade (atual)" placeholder="5" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="humanity" label="Humanidade / Via" placeholder="7" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>

          {/* Experiência */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Experiência" />
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="xp_total" label="XP Total" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="xp_spent" label="XP Gasto" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>

          {/* Observações */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Observações" />
            <TFField characterId={characterId} textFields={textFields} tfKey="observations" label="Observações" placeholder="Anotações sobre este personagem..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {/* ── Personagem ── */}
      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Identidade" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="clan" label="Clã" placeholder="Brujah, Malkaviano..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="sect" label="Seita" placeholder="Camarilla, Sabbat..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="nature" label="Natureza" placeholder="Arquétipo..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="demeanor" label="Comportamento" placeholder="Arquétipo..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="sire" label="Senhor" placeholder="Quem te Abraçou..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="embrace_date" label="Data do Abraço" placeholder="Ex: 1924..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="concept" label="Conceito" placeholder="Quem você era antes do Abraço..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="haven" label="Refúgio" placeholder="Localização e descrição do Haven..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" placeholder="Sua história como kindred..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="notes" label="Notas" placeholder="Anotações..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
