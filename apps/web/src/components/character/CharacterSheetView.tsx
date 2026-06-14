'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddAttributeModal } from './AddAttributeModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { FateCoreSheet } from './sheets/FateCoreSheet'
import { VtMV5Sheet } from './sheets/VtMV5Sheet'
import { BitDSheet } from './sheets/BitDSheet'
import { VtMV20Sheet } from './sheets/VtMV20Sheet'
import { WerewolfSheet } from './sheets/WerewolfSheet'
import { MageAscSheet } from './sheets/MageAscSheet'
import { MageAwkSheet } from './sheets/MageAwkSheet'
import { HunterSheet } from './sheets/HunterSheet'
import { ChangelingSheet } from './sheets/ChangelingSheet'
import { DemonSheet } from './sheets/DemonSheet'
import { GeistSheet } from './sheets/GeistSheet'
import { CoC7eSheet } from './sheets/CoC7eSheet'
import { DeltaGreenSheet } from './sheets/DeltaGreenSheet'
import { MothershipSheet } from './sheets/MothershipSheet'
import { CyberpunkRedSheet } from './sheets/CyberpunkRedSheet'
import { StarfinderSheet } from './sheets/StarfinderSheet'
import { Shadowrun6eSheet } from './sheets/Shadowrun6eSheet'
import { StarWarsSheet } from './sheets/StarWarsSheet'
import { GURPSSheet } from './sheets/GURPSSheet'
import { SavageWorldsSheet } from './sheets/SavageWorldsSheet'
import { IronswornSheet } from './sheets/IronswornSheet'
import { DnD35Sheet } from './sheets/DnD35Sheet'
import { Pathfinder1eSheet } from './sheets/Pathfinder1eSheet'
import { Pathfinder2eSheet } from './sheets/Pathfinder2eSheet'
import { Tormenta20Sheet } from './sheets/Tormenta20Sheet'
import { DungeonWorldSheet } from './sheets/DungeonWorldSheet'
import { Age13Sheet } from './sheets/Age13Sheet'
import { X, Plus, Shield, Sword, Wand2, BookOpen, User, ChevronDown, ChevronUp } from 'lucide-react'

export type SheetCategory = 'fantasy' | 'world-of-darkness' | 'horror' | 'scifi' | 'generic' | 'custom'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface SpellSlot {
  id: string
  level: number
  total: number
  used: number
}

interface Props {
  characterId: string
  characterLevel: number
  attributes: Attr[]
  textFields: TextField[]
  weapons: Weapon[]
  spellSlots: SpellSlot[]
  canEdit: boolean
  canEditWeapons?: boolean
  category: SheetCategory
  systemName: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTR_ABBREV: Record<string, string> = {
  'Força': 'FOR', 'Destreza': 'DES', 'Constituição': 'CON', 'Inteligência': 'INT',
  'Sabedoria': 'SAB', 'Carisma': 'CAR', 'Percepção': 'PER', 'Vigor': 'VIG',
  'Tamanho': 'TAM', 'Aparência': 'APR', 'Poder': 'POD', 'Educação': 'EDU',
  'Manipulação': 'MAN', 'Compostura': 'COM', 'Determinação': 'DET',
  'Raciocínio': 'RAC', 'Presença': 'PRE', 'Sanidade': 'SAN', 'Saúde': 'SAU',
}

const FANTASY_CORE = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
const COMBAT_NAMES = new Set(['CA', 'Classe de Armadura', 'Iniciativa', 'Velocidade', 'Proficiência', 'Bônus de Proficiência'])

const DND_SKILL_ATTR_MAP: Record<string, string> = {
  FOR: 'Força', DES: 'Destreza', CON: 'Constituição',
  INT: 'Inteligência', SAB: 'Sabedoria', CAR: 'Carisma',
}

const ATTR_COLORS: Record<string, string> = {
  FOR: '#ef4444', DES: '#22c55e', CON: '#f97316',
  INT: '#3b82f6', SAB: '#8b5cf6', CAR: '#ec4899',
}

// CoC skill sets
const COC_COMBAT_SKILLS = new Set(['Artes Marciais', 'Luta (Soco)', 'Armas de Fogo (Pistola)', 'Armas de Fogo (Rifle)', 'Arremessar', 'Esquivar'])
const COC_EXPLORATION_SKILLS = new Set(['Escalar', 'Natação', 'Saltar', 'Furtividade', 'Disfarce', 'Dirigir Auto', 'Navegação'])
const COC_TECHNICAL_SKILLS = new Set(['Primeiros Socorros', 'Medicina', 'Reparar Elétrica', 'Reparar Mecânica', 'Usar Computador', 'Fotografar'])
const COC_KNOWLEDGE_SKILLS = new Set(['Pesquisa em Biblioteca', 'Ocultismo', 'Mitos de Cthulhu', 'História', 'Ciências (Biologia)', 'Ciências (Física)', 'Direito', 'Contabilidade'])
const COC_SOCIAL_SKILLS = new Set(['Charme', 'Intimidação', 'Lábia', 'Persuasão', 'Psicologia', 'Idioma Próprio', 'Idioma Estrangeiro'])
const COC_PERCEPTION_SKILLS = new Set(['Detectar', 'Ouvir', 'Rastrear', 'Arte e Ofício (Pintura)'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dndMod(value: number) {
  const m = Math.floor((value - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function signedVal(v: number) {
  return v >= 0 ? `+${v}` : `${v}`
}

function profBonusFromLevel(level: number) {
  return Math.ceil(level / 4) + 1
}

function isPercentile(attr: Attr) {
  return (attr.customDie ?? attr.attribute.defaultDie) === 'd100'
}

// ─── Grouping functions ───────────────────────────────────────────────────────

function groupDnD5e(attrs: Attr[]) {
  const core: Attr[] = [], saves: Attr[] = [], skills: Attr[] = [], combat: Attr[] = [], extras: Attr[] = []
  for (const a of attrs) {
    const desc = a.attribute.description ?? ''
    if (desc.startsWith('Atributo —'))       core.push(a)
    else if (desc.startsWith('Salvaguarda —')) saves.push(a)
    else if (desc.startsWith('Perícia ('))    skills.push(a)
    else if (desc.startsWith('Combate —'))    combat.push(a)
    else extras.push(a)
  }
  const byAttr: Record<string, Attr[]> = {}
  for (const s of skills) {
    const match = s.attribute.description?.match(/Perícia \((\w+)\)/)
    const key = match?.[1] ?? 'Outros'
    if (!byAttr[key]) byAttr[key] = []
    byAttr[key]!.push(s)
  }
  return { core, saves, skills, byAttr, combat, extras }
}

function groupCoC(attrs: Attr[]) {
  const characteristics: Attr[] = [], derived: Attr[] = []
  const combat: Attr[] = [], exploration: Attr[] = [], technical: Attr[] = []
  const knowledge: Attr[] = [], social: Attr[] = [], perception: Attr[] = [], other: Attr[] = []
  for (const a of attrs) {
    const desc = a.attribute.description ?? ''
    const name = a.attribute.name
    if (desc.startsWith('Característica —'))    characteristics.push(a)
    else if (desc.startsWith('Derivado —'))     derived.push(a)
    else if (COC_COMBAT_SKILLS.has(name))       combat.push(a)
    else if (COC_EXPLORATION_SKILLS.has(name))  exploration.push(a)
    else if (COC_TECHNICAL_SKILLS.has(name))    technical.push(a)
    else if (COC_KNOWLEDGE_SKILLS.has(name))    knowledge.push(a)
    else if (COC_SOCIAL_SKILLS.has(name))       social.push(a)
    else if (COC_PERCEPTION_SKILLS.has(name))   perception.push(a)
    else                                        other.push(a)
  }
  return { characteristics, derived, combat, exploration, technical, knowledge, social, perception, other }
}

function categorizeWoD(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const physSkills: Attr[] = [], socSkills: Attr[] = [], menSkills: Attr[] = []
  const disciplines: Attr[] = [], backgrounds: Attr[] = [], virtues: Attr[] = []
  const powers: Attr[] = [], resources: Attr[] = []
  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    if (d.startsWith('Habilidade Física'))      physSkills.push(a)
    else if (d.startsWith('Habilidade Social')) socSkills.push(a)
    else if (d.startsWith('Habilidade Mental')) menSkills.push(a)
    else if (d.startsWith('Físico'))            physical.push(a)
    else if (d.startsWith('Social'))            social.push(a)
    else if (d.startsWith('Mental'))            mental.push(a)
    else if (d.startsWith('Talento'))           talents.push(a)
    else if (d.startsWith('Perícia'))           skills.push(a)
    else if (d.startsWith('Conhecimento'))      knowledges.push(a)
    else if (d.startsWith('Disciplina'))        disciplines.push(a)
    else if (d.startsWith('Antecedente'))       backgrounds.push(a)
    else if (d.startsWith('Virtude'))           virtues.push(a)
    else if (d.startsWith('Esfera') || d.startsWith('Arcano')) powers.push(a)
    else resources.push(a)
  }
  return { physical, social, mental, talents, skills, knowledges, physSkills, socSkills, menSkills, disciplines, backgrounds, virtues, powers, resources }
}

function groupByPrefix(attrs: Attr[]) {
  const groups: Record<string, Attr[]> = {}
  for (const a of attrs) {
    const parts = a.attribute.name.split(' — ')
    const key = parts.length > 1 ? (parts[0] ?? 'Outros') : 'Outros'
    if (!groups[key]) groups[key] = []
    groups[key]!.push(a)
  }
  return groups
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function EditableVal({ attrId, value, characterId, onSaved, className }: {
  attrId: string; value: number; characterId: string; onSaved: () => void; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  const [saving, setSaving] = useState(false)

  async function save() {
    const n = parseInt(val)
    if (isNaN(n) || n === value) { setEditing(false); return }
    setSaving(true)
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: n }),
    }).catch(() => null)
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  if (editing) {
    return (
      <input
        autoFocus type="number" value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
        className={`bg-surface-2 border border-gold/40 rounded text-center font-bold focus:outline-none text-saga-text ${className ?? 'w-12 text-base'}`}
        style={{ MozAppearance: 'textfield' }}
      />
    )
  }
  return (
    <span className={`cursor-pointer hover:text-gold transition-colors ${className ?? ''}`}
      onClick={() => { setEditing(true); setVal(String(value)) }}>
      {saving ? '…' : value}
    </span>
  )
}

function EditableText({ value, onSave, placeholder, multiline = false, className }: {
  value: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() {
    onSave(val)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setEditing(true); setVal(value) }}
        className={`cursor-pointer hover:bg-white/[0.03] rounded px-2 py-1 transition-colors min-h-[28px] ${className ?? 'text-sm text-saga-text'}`}
      >
        {value || <span className="text-saga-dim italic text-xs">{placeholder ?? 'Clique para editar…'}</span>}
      </div>
    )
  }

  if (multiline) {
    return (
      <textarea
        autoFocus rows={4} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
        placeholder={placeholder}
        className={`w-full bg-surface-2 border border-gold/40 rounded px-2 py-1 text-sm focus:outline-none resize-none ${className ?? ''}`}
      />
    )
  }
  return (
    <input
      autoFocus type="text" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      placeholder={placeholder}
      className={`w-full bg-surface-2 border border-gold/40 rounded px-2 py-1 text-sm focus:outline-none ${className ?? ''}`}
    />
  )
}

function WoDDots({ value, max = 5, editable = false, attrId, characterId, onSaved }: {
  value: number; max?: number; editable?: boolean
  attrId?: string; characterId?: string; onSaved?: () => void
}) {
  async function handleClick(dotIndex: number) {
    if (!editable || !attrId || !characterId || !onSaved) return
    const newVal = dotIndex + 1 === value ? dotIndex : dotIndex + 1
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
            background: i < value ? '#c9a22a' : 'transparent',
            borderColor: i < value ? '#c9a22a' : 'rgba(255,255,255,0.15)',
            cursor: editable ? 'pointer' : 'default',
          }} />
      ))}
    </div>
  )
}

function SectionDivider({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
      {action}
    </div>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded border border-saga-danger/30 text-saga-danger hover:bg-saga-danger/10 flex-shrink-0">
      <X size={10} />
    </button>
  )
}

function AddBtn({ onClick, label = 'Adicionar' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0"
      style={{ background: 'rgba(201,162,42,0.08)', border: '1px solid rgba(201,162,42,0.3)', color: '#c9a22a' }}>
      <Plus size={9} />{label}
    </button>
  )
}

// ─── Weapons section (shared across all systems) ──────────────────────────────

function WeaponsSection({ weapons, characterId, canEdit, onRefresh }: {
  weapons: Weapon[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [newWeapon, setNewWeapon] = useState({ name: '', attackBonus: '', damage: '', damageType: '', range: '', properties: '' })
  const [saving, setSaving] = useState(false)

  async function addWeapon() {
    if (!newWeapon.name.trim()) return
    setSaving(true)
    await fetch(`/api/characters/${characterId}/weapons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWeapon),
    }).catch(() => null)
    setSaving(false)
    setAdding(false)
    setNewWeapon({ name: '', attackBonus: '', damage: '', damageType: '', range: '', properties: '' })
    onRefresh()
  }

  async function deleteWeapon(id: string) {
    await fetch(`/api/characters/${characterId}/weapons/${id}`, { method: 'DELETE' }).catch(() => null)
    onRefresh()
  }

  async function patchWeapon(id: string, field: string, value: string) {
    await fetch(`/api/characters/${characterId}/weapons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div>
      <SectionDivider title="Ataques & Armas" action={canEdit ? <AddBtn onClick={() => setAdding(true)} /> : undefined} />

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 mb-1.5 px-2">
        {['Nome', 'Bônus', 'Dano', 'Alcance'].map(h => (
          <span key={h} className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim">{h}</span>
        ))}
      </div>

      {/* Rows */}
      {weapons.length === 0 && !adding && (
        <p className="text-xs text-saga-dim text-center py-3 italic">
          {canEdit ? 'Nenhuma arma. Clique em Adicionar.' : 'Nenhuma arma.'}
        </p>
      )}

      {weapons.map(w => (
        <div key={w.id} className="grid grid-cols-[1fr_80px_100px_80px] gap-2 mb-1 px-2 group items-center rounded hover:bg-white/[0.015] transition-all">
          {canEdit ? (
            <>
              <EditableText value={w.name} onSave={v => patchWeapon(w.id, 'name', v)} placeholder="Espada Longa" className="text-sm font-medium text-saga-text" />
              <EditableText value={w.attackBonus ?? ''} onSave={v => patchWeapon(w.id, 'attackBonus', v)} placeholder="+5" className="text-sm text-center font-cinzel text-gold" />
              <EditableText value={w.damage ?? ''} onSave={v => patchWeapon(w.id, 'damage', v)} placeholder="1d8+3" className="text-sm text-center font-mono" />
              <div className="flex items-center gap-1">
                <EditableText value={w.range ?? ''} onSave={v => patchWeapon(w.id, 'range', v)} placeholder="C.a.C" className="text-xs text-saga-muted flex-1" />
                <DeleteBtn onClick={() => void deleteWeapon(w.id)} />
              </div>
            </>
          ) : (
            <>
              <span className="text-sm font-medium py-2">{w.name}</span>
              <span className="text-sm text-center font-cinzel text-gold py-2">{w.attackBonus ?? '—'}</span>
              <span className="text-sm text-center font-mono py-2">{w.damage ?? '—'}</span>
              <span className="text-xs text-saga-muted py-2">{w.range ?? '—'}</span>
            </>
          )}
        </div>
      ))}

      {/* Add row */}
      {adding && canEdit && (
        <div className="mt-2 rounded p-3 space-y-2"
          style={{ background: 'rgba(201,162,42,0.04)', border: '1px solid rgba(201,162,42,0.2)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-saga-dim block mb-1">Nome *</label>
              <input value={newWeapon.name} onChange={e => setNewWeapon(p => ({ ...p, name: e.target.value }))}
                placeholder="Espada Longa"
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-saga-dim block mb-1">Bônus de Ataque</label>
              <input value={newWeapon.attackBonus} onChange={e => setNewWeapon(p => ({ ...p, attackBonus: e.target.value }))}
                placeholder="+5"
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-saga-dim block mb-1">Dano</label>
              <input value={newWeapon.damage} onChange={e => setNewWeapon(p => ({ ...p, damage: e.target.value }))}
                placeholder="1d8+3"
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-saga-dim block mb-1">Tipo de Dano</label>
              <input value={newWeapon.damageType} onChange={e => setNewWeapon(p => ({ ...p, damageType: e.target.value }))}
                placeholder="cortante"
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-saga-dim block mb-1">Alcance</label>
              <input value={newWeapon.range} onChange={e => setNewWeapon(p => ({ ...p, range: e.target.value }))}
                placeholder="Corpo a corpo"
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-saga-dim block mb-1">Propriedades</label>
              <input value={newWeapon.properties} onChange={e => setNewWeapon(p => ({ ...p, properties: e.target.value }))}
                placeholder="versátil, acuidade…"
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold/60" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)}
              className="px-3 py-1.5 rounded text-xs border text-saga-muted hover:text-saga-text transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
            <button onClick={() => void addWeapon()} disabled={saving || !newWeapon.name.trim()}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'rgba(201,162,42,0.15)', border: '1px solid rgba(201,162,42,0.4)', color: '#c9a22a' }}>
              {saving ? 'Salvando…' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Spell Slots section (D&D 5e, Tormenta, PF) ───────────────────────────────

function SpellSlotsSection({ spellSlots, characterId, canEdit, onRefresh }: {
  spellSlots: SpellSlot[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  async function patch(level: number, field: 'total' | 'used', value: number) {
    await fetch(`/api/characters/${characterId}/spell-slots`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, [field]: value }),
    }).catch(() => null)
    onRefresh()
  }

  async function toggleUsed(level: number, currentUsed: number, total: number) {
    if (!canEdit) return
    const next = currentUsed < total ? currentUsed + 1 : 0
    await patch(level, 'used', next)
  }

  const levels = Array.from({ length: 9 }, (_, i) => i + 1)

  return (
    <div>
      <SectionDivider title="Espaços de Magia" />
      <div className="grid grid-cols-3 gap-2">
        {levels.map(lvl => {
          const slot = spellSlots.find(s => s.level === lvl)
          const total = slot?.total ?? 0
          const used = slot?.used ?? 0
          return (
            <div key={lvl} className="rounded p-2.5"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider">Nível {lvl}</span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => void patch(lvl, 'total', Math.max(0, total - 1))}
                      className="w-4 h-4 rounded text-saga-dim hover:text-gold flex items-center justify-center text-xs">−</button>
                    <span className="font-cinzel text-xs text-gold w-4 text-center">{total}</span>
                    <button onClick={() => void patch(lvl, 'total', total + 1)}
                      className="w-4 h-4 rounded text-saga-dim hover:text-gold flex items-center justify-center text-xs">+</button>
                  </div>
                )}
                {!canEdit && <span className="font-cinzel text-xs text-gold">{total}</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {total === 0 ? (
                  <span className="text-[9px] text-saga-dim italic">—</span>
                ) : (
                  Array.from({ length: total }).map((_, i) => (
                    <button key={i}
                      onClick={() => void toggleUsed(lvl, used, total)}
                      disabled={!canEdit}
                      title={i < used ? 'Gasto' : 'Disponível'}
                      className="rounded-full border transition-all"
                      style={{
                        width: 12, height: 12,
                        background: i < used ? 'rgba(120,120,160,0.3)' : '#c9a22a',
                        borderColor: i < used ? 'rgba(120,120,160,0.5)' : '#c9a22a',
                        cursor: canEdit ? 'pointer' : 'default',
                      }} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Spell List section ───────────────────────────────────────────────────────

interface SpellEntry { name: string; cost?: string; desc?: string }

const SPELL_COST_OPTIONS = [
  '1 ação', '1 ação bônus', '1 reação', '1 minuto',
  '10 minutos', '1 hora', '8 horas', 'Ritual',
]

function parseSpells(textFields: TextField[], level: number): SpellEntry[] {
  const key = level === 0 ? 'spells_cantrip' : `spells_lvl${level}`
  const field = textFields.find(f => f.key === key)
  if (!field?.value) return []
  try {
    const parsed = JSON.parse(field.value) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(item =>
      typeof item === 'string' ? { name: item } : item as SpellEntry
    ).filter(item => typeof item === 'object' && item !== null && (item as SpellEntry).name)
  } catch { return [] }
}

function SpellCard({ spell, canEdit, onRemove }: { spell: SpellEntry; canEdit: boolean; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasExtra = !!(spell.cost || spell.desc)
  return (
    <div className="rounded group transition-all"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start gap-2 px-3 py-2">
        {hasExtra && (
          <button onClick={() => setExpanded(e => !e)}
            className="mt-0.5 text-saga-dim hover:text-saga-text transition-colors shrink-0">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-saga-text font-medium">{spell.name}</span>
            {spell.cost && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
                {spell.cost}
              </span>
            )}
          </div>
          {spell.desc && expanded && (
            <p className="text-[11px] text-saga-muted mt-1 leading-relaxed whitespace-pre-wrap">{spell.desc}</p>
          )}
          {spell.desc && !expanded && (
            <button onClick={() => setExpanded(true)} className="text-[10px] text-saga-dim hover:text-saga-muted mt-0.5 transition-colors">
              {spell.desc.slice(0, 60)}{spell.desc.length > 60 ? '…' : ''}
            </button>
          )}
        </div>
        {canEdit && (
          <button onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-saga-dim hover:text-saga-danger transition-all shrink-0 mt-0.5">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

const BLANK_DRAFT: SpellEntry = { name: '', cost: '', desc: '' }

function SpellListSection({ textFields, spellSlots, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; spellSlots: SpellSlot[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const [drafts, setDrafts] = useState<Record<number, SpellEntry>>({})
  const [adding, setAdding] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)

  function getDraft(lvl: number): SpellEntry { return drafts[lvl] ?? BLANK_DRAFT }
  function setDraftField(lvl: number, field: keyof SpellEntry, val: string) {
    setDrafts(d => ({ ...d, [lvl]: { ...getDraft(lvl), [field]: val } }))
  }

  async function saveSpells(level: number, spells: SpellEntry[]) {
    const key = level === 0 ? 'spells_cantrip' : `spells_lvl${level}`
    const label = level === 0 ? 'Truques (Cantrips)' : `Magias de Nível ${level}`
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value: JSON.stringify(spells) }),
    }).catch(() => null)
    onRefresh()
  }

  async function addSpell(level: number) {
    const draft = getDraft(level)
    if (!draft.name.trim()) return
    setSaving(true)
    const entry: SpellEntry = {
      name: draft.name.trim(),
      ...(draft.cost?.trim() && { cost: draft.cost.trim() }),
      ...(draft.desc?.trim() && { desc: draft.desc.trim() }),
    }
    await saveSpells(level, [...parseSpells(textFields, level), entry])
    setDrafts(d => ({ ...d, [level]: BLANK_DRAFT }))
    setAdding(a => ({ ...a, [level]: false }))
    setSaving(false)
  }

  async function removeSpell(level: number, idx: number) {
    await saveSpells(level, parseSpells(textFields, level).filter((_, i) => i !== idx))
  }

  const visibleLevels = [
    0,
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(lvl => {
      const hasSlots = spellSlots.some(s => s.level === lvl && s.total > 0)
      const hasSpells = parseSpells(textFields, lvl).length > 0
      return hasSlots || hasSpells
    }),
  ]

  return (
    <div>
      <SectionDivider title="Magias Conhecidas" />
      <div className="space-y-3">
        {visibleLevels.map(lvl => {
          const spells = parseSpells(textFields, lvl)
          const levelLabel = lvl === 0 ? 'Truques' : `Nível ${lvl}`
          const isAdding = !!(adding[lvl])
          const draft = getDraft(lvl)
          return (
            <div key={lvl} className="rounded p-3"
              style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider">{levelLabel}</p>
                {canEdit && !isAdding && (
                  <button onClick={() => setAdding(a => ({ ...a, [lvl]: true }))}
                    className="text-[11px] text-saga-dim hover:text-gold transition-colors font-bold">
                    + Adicionar
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {spells.map((spell, i) => (
                  <SpellCard key={i} spell={spell} canEdit={canEdit}
                    onRemove={() => void removeSpell(lvl, i)} />
                ))}
                {spells.length === 0 && !canEdit && (
                  <span className="text-[11px] text-saga-dim italic">—</span>
                )}
              </div>

              {canEdit && isAdding && (
                <div className="mt-2 rounded p-3 space-y-2"
                  style={{ background: 'rgba(201,162,42,0.04)', border: '1px solid rgba(201,162,42,0.15)' }}>
                  <input
                    value={draft.name}
                    onChange={e => setDraftField(lvl, 'name', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addSpell(lvl) } }}
                    placeholder={lvl === 0 ? 'Nome do truque...' : 'Nome da magia...'}
                    autoFocus
                    className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-gold/60 transition-colors" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-saga-dim uppercase tracking-widest block mb-1">Custo</label>
                      <input
                        list={`cost-options-${lvl}`}
                        value={draft.cost ?? ''}
                        onChange={e => setDraftField(lvl, 'cost', e.target.value)}
                        placeholder="1 ação..."
                        className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-gold/60 transition-colors" />
                      <datalist id={`cost-options-${lvl}`}>
                        {SPELL_COST_OPTIONS.map(o => <option key={o} value={o} />)}
                      </datalist>
                    </div>
                    <div />
                  </div>
                  <div>
                    <label className="text-[9px] text-saga-dim uppercase tracking-widest block mb-1">Descrição</label>
                    <textarea
                      value={draft.desc ?? ''}
                      onChange={e => setDraftField(lvl, 'desc', e.target.value)}
                      placeholder="Descreva o efeito da magia..."
                      rows={3}
                      className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-gold/60 transition-colors resize-none" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setAdding(a => ({ ...a, [lvl]: false })); setDrafts(d => ({ ...d, [lvl]: BLANK_DRAFT })) }}
                      className="px-3 py-1.5 rounded text-saga-dim hover:text-saga-text text-[12px] transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={() => void addSpell(lvl)}
                      disabled={saving || !draft.name.trim()}
                      className="px-3 py-1.5 rounded text-[12px] font-medium transition-colors disabled:opacity-40"
                      style={{ background: 'rgba(201,162,42,0.15)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.3)' }}>
                      {saving ? 'Salvando...' : 'Salvar Magia'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Text Fields section ──────────────────────────────────────────────────────

function TextFieldsSection({ fields, characterId, canEdit, onRefresh }: {
  fields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  async function save(key: string, label: string, value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value }),
    }).catch(() => null)
    onRefresh()
  }

  if (fields.length === 0) return null

  return (
    <div className="space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim block mb-1">{f.label}</label>
          {canEdit ? (
            <EditableText
              value={f.value}
              onSave={v => void save(f.key, f.label, v)}
              placeholder={`${f.label}…`}
              multiline
              className="text-sm text-saga-text"
            />
          ) : (
            <p className="text-sm text-saga-text px-2 py-1 whitespace-pre-wrap">
              {f.value || <span className="text-saga-dim italic text-xs">—</span>}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Death Saves ──────────────────────────────────────────────────────────────

function DeathSaves({ successes, failures, canEdit, onToggleSuccess, onToggleFailure }: {
  successes: number; failures: number; canEdit: boolean
  onToggleSuccess: (n: number) => void; onToggleFailure: (n: number) => void
}) {
  return (
    <div className="rounded p-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-3 text-center">Testes Contra a Morte</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-saga-success">Sucessos</span>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => canEdit && onToggleSuccess(n)}
                disabled={!canEdit}
                className="rounded-full border transition-all"
                style={{
                  width: 14, height: 14,
                  background: n <= successes ? '#22c55e' : 'transparent',
                  borderColor: n <= successes ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  cursor: canEdit ? 'pointer' : 'default',
                }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-saga-danger">Fracassos</span>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => canEdit && onToggleFailure(n)}
                disabled={!canEdit}
                className="rounded-full border transition-all"
                style={{
                  width: 14, height: 14,
                  background: n <= failures ? '#ef4444' : 'transparent',
                  borderColor: n <= failures ? '#ef4444' : 'rgba(255,255,255,0.2)',
                  cursor: canEdit ? 'pointer' : 'default',
                }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── D&D 5e sheets ───────────────────────────────────────────────────────────

function DnD5eAtributos({ dnd, characterId, canEdit, level, onAdd, onDelete, onRefresh }: {
  dnd: ReturnType<typeof groupDnD5e>; characterId: string; canEdit: boolean
  level: number; onAdd: () => void; onDelete: (id: string) => void; onRefresh: () => void
}) {
  const profBonus = profBonusFromLevel(level)

  return (
    <div className="space-y-7">
      {dnd.core.length > 0 && (
        <div>
          <SectionDivider title="Atributos" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {dnd.core.map(attr => {
              const mod = dndMod(attr.value)
              const pos = !mod.startsWith('-')
              return (
                <div key={attr.id}
                  className="flex flex-col items-center gap-2 py-5 px-1 rounded-lg border group transition-all hover:border-gold/25"
                  style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className={`font-cinzel text-3xl font-bold leading-none ${pos ? 'text-gold' : 'text-saga-danger'}`}>{mod}</span>
                  <div className="w-8 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
                  {canEdit
                    ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="text-sm text-saga-muted w-10 text-center" />
                    : <span className="text-sm text-saga-muted">{attr.value}</span>
                  }
                  <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest">
                    {ATTR_ABBREV[attr.attribute.name] ?? attr.attribute.name.slice(0, 3).toUpperCase()}
                  </span>
                  {canEdit && (
                    <button onClick={() => onDelete(attr.id)} className="hidden group-hover:block text-[8px] text-saga-danger/50 hover:text-saga-danger transition-colors">remover</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {dnd.saves.length > 0 && (
        <div>
          <SectionDivider title="Testes de Resistência" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {dnd.saves.map(attr => {
              const pos = attr.value >= 0
              return (
                <div key={attr.id}
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded group hover:bg-white/[0.02] transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Shield size={10} className="text-saga-dim shrink-0" />
                  <span className="flex-1 text-[11px] text-saga-muted truncate">{attr.attribute.name.replace('Salv. ', '')}</span>
                  {canEdit
                    ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh}
                        className={`font-cinzel font-bold text-sm w-8 text-right ${pos ? 'text-gold' : 'text-saga-danger'}`} />
                    : <span className={`font-cinzel font-bold text-sm ${pos ? 'text-gold' : 'text-saga-danger'}`}>{signedVal(attr.value)}</span>
                  }
                  {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">Outros</p>
          <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
          {canEdit && <AddBtn onClick={onAdd} />}
        </div>
        {dnd.extras.map(attr => (
          <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded group hover:bg-white/[0.015] transition-all">
            <span className="flex-1 text-sm">{attr.attribute.name}</span>
            {canEdit
              ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="text-sm text-saga-muted w-10 text-center" />
              : <span className="text-sm text-saga-muted">{attr.value}</span>
            }
            {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
          </div>
        ))}
        {dnd.extras.length === 0 && canEdit && (
          <button onClick={onAdd} className="w-full py-3 rounded border border-dashed text-xs text-saga-dim hover:text-saga-muted transition-colors" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            + Adicionar campo extra
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px]"
          style={{ background: 'rgba(201,162,42,0.08)', border: '1px solid rgba(201,162,42,0.2)' }}>
          <span className="text-saga-dim">Bônus de Proficiência</span>
          <span className="font-cinzel font-bold text-gold">+{profBonus}</span>
          <span className="text-saga-dim/50">nível {level}</span>
        </div>
      </div>
    </div>
  )
}

function DnD5ePericias({ dnd, characterId, canEdit, onAdd, onDelete, onRefresh }: {
  dnd: ReturnType<typeof groupDnD5e>; characterId: string; canEdit: boolean
  onAdd: () => void; onDelete: (id: string) => void; onRefresh: () => void
}) {
  const attrOrder = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR']
  const hasSkills = Object.keys(dnd.byAttr).length > 0
  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="flex justify-end">
          <AddBtn onClick={onAdd} />
        </div>
      )}
      {attrOrder.map(abbrev => {
        const skills = dnd.byAttr[abbrev] ?? []
        if (skills.length === 0) return null
        const color = ATTR_COLORS[abbrev] ?? '#c9a22a'
        return (
          <div key={abbrev}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-cinzel text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>{abbrev}</span>
              <span className="text-[10px] text-saga-dim">{DND_SKILL_ATTR_MAP[abbrev]}</span>
              <div className="flex-1 h-px" style={{ background: `${color}20` }} />
            </div>
            {skills.map(attr => {
              const pos = attr.value >= 0
              return (
                <div key={attr.id} className="flex items-center gap-3 py-2 px-2 rounded group hover:bg-white/[0.015] transition-all">
                  <span className="flex-1 text-sm">{attr.attribute.name}</span>
                  {canEdit
                    ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh}
                        className={`font-cinzel font-bold text-base w-8 text-right ${pos ? 'text-gold' : 'text-saga-danger'}`} />
                    : <span className={`font-cinzel font-bold text-base ${pos ? 'text-gold' : 'text-saga-danger'}`}>{signedVal(attr.value)}</span>
                  }
                  {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
                </div>
              )
            })}
          </div>
        )
      })}
      {!hasSkills && (
        <p className="text-sm text-saga-dim text-center py-8">
          {canEdit ? 'Clique em "+" para adicionar perícias D&D 5e.' : 'Nenhuma perícia adicionada.'}
        </p>
      )}
    </div>
  )
}

function DnD5eCombate({ dnd, characterId, canEdit, canEditWeapons = canEdit, level, weapons, spellSlots, textFields, onDelete, onRefresh }: {
  dnd: ReturnType<typeof groupDnD5e>; characterId: string; canEdit: boolean; canEditWeapons?: boolean
  level: number; weapons: Weapon[]; spellSlots: SpellSlot[]; textFields: TextField[]
  onDelete: (id: string) => void; onRefresh: () => void
}) {
  const dex = dnd.core.find(a => a.attribute.name === 'Destreza')
  const dexMod = dex ? Math.floor((dex.value - 10) / 2) : null
  const iniciativa = dexMod !== null ? signedVal(dexMod) : '—'
  const profBonus = `+${profBonusFromLevel(level)}`

  // Death saves from text fields
  const deathSuccessesField = textFields.find(f => f.key === 'deathSuccesses')
  const deathFailuresField = textFields.find(f => f.key === 'deathFailures')
  const deathSuccesses = parseInt(deathSuccessesField?.value ?? '0') || 0
  const deathFailures = parseInt(deathFailuresField?.value ?? '0') || 0

  async function saveTextField(key: string, label: string, value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Valores calculados */}
      <div>
        <SectionDivider title="Valores Calculados" />
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center py-5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-cinzel text-3xl font-bold text-gold">{iniciativa}</p>
            <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest mt-2">Iniciativa</p>
            {dex && <p className="text-[9px] text-saga-dim/50 mt-0.5">de Destreza {dex.value}</p>}
          </div>
          <div className="text-center py-5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-cinzel text-3xl font-bold text-gold">{profBonus}</p>
            <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest mt-2">Proficiência</p>
            <p className="text-[9px] text-saga-dim/50 mt-0.5">nível {level}</p>
          </div>
        </div>
      </div>

      {/* Atributos de combate */}
      {dnd.combat.length > 0 && (
        <div>
          <SectionDivider title="Classe de Armadura & Combate" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dnd.combat.map(attr => (
              <div key={attr.id}
                className="flex flex-col items-center gap-1.5 py-4 rounded-lg group hover:border-gold/25 transition-all"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {canEdit
                  ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh}
                      className="font-cinzel font-bold text-2xl text-gold w-16 text-center" />
                  : <span className="font-cinzel font-bold text-2xl text-gold">{attr.value}</span>
                }
                <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest">{attr.attribute.name}</span>
                {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testes contra a morte */}
      <DeathSaves
        successes={deathSuccesses}
        failures={deathFailures}
        canEdit={canEdit}
        onToggleSuccess={n => void saveTextField('deathSuccesses', 'Sucessos', String(n === deathSuccesses ? 0 : n))}
        onToggleFailure={n => void saveTextField('deathFailures', 'Fracassos', String(n === deathFailures ? 0 : n))}
      />

      {/* Armas */}
      <WeaponsSection weapons={weapons} characterId={characterId} canEdit={canEditWeapons} onRefresh={onRefresh} />
    </div>
  )
}

function DnD5eMagias({ spellSlots, textFields, characterId, canEdit, onRefresh }: {
  spellSlots: SpellSlot[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  return (
    <div className="space-y-6">
      <SpellSlotsSection spellSlots={spellSlots} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
      <SpellListSection textFields={textFields} spellSlots={spellSlots} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
    </div>
  )
}

function DnD5ePersonagem({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const NARRATIVE_FIELDS = [
    { key: 'personalityTraits', label: 'Traços de Personalidade', order: 0 },
    { key: 'ideals',            label: 'Ideais',                  order: 1 },
    { key: 'bonds',             label: 'Ligações',                order: 2 },
    { key: 'flaws',             label: 'Defeitos',                order: 3 },
    { key: 'backstory',         label: 'História do Personagem',  order: 4 },
    { key: 'appearance',        label: 'Aparência',               order: 5 },
    { key: 'alliesOrgs',        label: 'Aliados e Organizações',  order: 6 },
    { key: 'treasure',          label: 'Tesouro',                 order: 7 },
    { key: 'notes',             label: 'Notas',                   order: 8 },
  ]

  async function save(key: string, label: string, value: string) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value, order: NARRATIVE_FIELDS.findIndex(f => f.key === key) }),
    }).catch(() => null)
    onRefresh()
  }

  // Ensure all fields exist (at least as empty)
  const resolvedFields = NARRATIVE_FIELDS.map(f => {
    const existing = textFields.find(tf => tf.key === f.key)
    return existing ?? { id: '', key: f.key, label: f.label, value: '', order: f.order }
  }).filter(f => f.key !== 'deathSuccesses' && f.key !== 'deathFailures')

  return (
    <div className="space-y-4">
      {resolvedFields.map(f => (
        <div key={f.key} className="rounded p-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim block mb-2">{f.label}</label>
          {canEdit ? (
            <EditableText
              value={f.value}
              onSave={v => void save(f.key, f.label, v)}
              placeholder={`${f.label}…`}
              multiline
            />
          ) : (
            <p className="text-sm text-saga-text whitespace-pre-wrap leading-relaxed">
              {f.value || <span className="text-saga-dim italic text-xs">—</span>}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Fantasy genérico ─────────────────────────────────────────────────────────

function FantasyAttrTab({ attrs, characterId, canEdit, onAdd, onDelete, onRefresh }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onAdd: () => void
  onDelete: (id: string) => void; onRefresh: () => void
}) {
  const core = attrs.filter(a => FANTASY_CORE.includes(a.attribute.name))
  const extras = attrs.filter(a => !FANTASY_CORE.includes(a.attribute.name) && !COMBAT_NAMES.has(a.attribute.name))

  return (
    <div className="space-y-7">
      {core.length > 0 && (
        <div>
          <SectionDivider title="Atributos Principais" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {core.map(attr => {
              const mod = dndMod(attr.value)
              const pos = !mod.startsWith('-')
              return (
                <div key={attr.id}
                  className="flex flex-col items-center gap-2 py-5 px-1 rounded-lg border group transition-all hover:border-gold/25"
                  style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className={`font-cinzel text-3xl font-bold leading-none ${pos ? 'text-gold' : 'text-saga-danger'}`}>{mod}</span>
                  <div className="w-8 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
                  {canEdit
                    ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="text-sm text-saga-muted w-10 text-center" />
                    : <span className="text-sm text-saga-muted">{attr.value}</span>
                  }
                  <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest">
                    {ATTR_ABBREV[attr.attribute.name] ?? attr.attribute.name.slice(0, 3).toUpperCase()}
                  </span>
                  {canEdit && (
                    <button onClick={() => onDelete(attr.id)} className="hidden group-hover:block text-[8px] text-saga-danger/50 hover:text-saga-danger transition-colors">remover</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">
            {core.length > 0 ? 'Atributos Extras' : 'Atributos'}
          </p>
          <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
          {canEdit && <AddBtn onClick={onAdd} />}
        </div>
        {extras.length === 0 ? (
          canEdit
            ? <button onClick={onAdd} className="w-full py-4 rounded border border-dashed text-sm text-saga-dim hover:text-saga-muted transition-colors" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>+ Adicionar atributo extra</button>
            : core.length > 0 ? null : <p className="text-sm text-saga-dim text-center py-6">Nenhum atributo.</p>
        ) : (
          <div className="space-y-1">
            {extras.map(attr => {
              const mod = dndMod(attr.value)
              const pos = !mod.startsWith('-')
              return (
                <div key={attr.id} className="flex items-center gap-3 py-3 px-2 rounded group hover:bg-white/[0.015] transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{attr.attribute.name}</p>
                    {attr.attribute.description && (
                      <p className="text-[10px] text-saga-dim truncate">{attr.attribute.description}</p>
                    )}
                  </div>
                  {canEdit
                    ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="text-sm text-saga-muted w-10 text-center" />
                    : <span className="text-sm text-saga-muted">{attr.value}</span>
                  }
                  <span className={`font-cinzel font-bold text-lg w-9 text-right ${pos ? 'text-gold' : 'text-saga-danger'}`}>{mod}</span>
                  {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FantasyCombateTab({ attrs, weapons, spellSlots, characterId, canEdit, onDelete, onRefresh, level, showSpells }: {
  attrs: Attr[]; weapons: Weapon[]; spellSlots: SpellSlot[]; characterId: string; canEdit: boolean
  onDelete: (id: string) => void; onRefresh: () => void; level: number; showSpells: boolean
}) {
  const combatAttrs = attrs.filter(a => COMBAT_NAMES.has(a.attribute.name))
  const dex = attrs.find(a => a.attribute.name === 'Destreza')
  const dexMod = dex ? Math.floor((dex.value - 10) / 2) : null
  const iniciativa = dexMod !== null ? signedVal(dexMod) : '—'

  return (
    <div className="space-y-6">
      <div>
        <SectionDivider title="Valores Calculados" />
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center py-5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-cinzel text-3xl font-bold text-gold">{iniciativa}</p>
            <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest mt-2">Iniciativa</p>
          </div>
          <div className="text-center py-5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-cinzel text-3xl font-bold text-gold">+{profBonusFromLevel(level)}</p>
            <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest mt-2">Proficiência</p>
          </div>
        </div>
      </div>

      {combatAttrs.length > 0 && (
        <div>
          <SectionDivider title="Atributos de Combate" />
          <div className="space-y-1">
            {combatAttrs.map(attr => (
              <div key={attr.id} className="flex items-center gap-3 py-3 px-2 rounded group hover:bg-white/[0.015] transition-all">
                <span className="flex-1 text-sm">{attr.attribute.name}</span>
                {canEdit
                  ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="font-cinzel font-bold text-lg text-gold w-10 text-center" />
                  : <span className="font-cinzel font-bold text-lg text-gold">{attr.value}</span>
                }
                {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <WeaponsSection weapons={weapons} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />

      {showSpells && (
        <SpellSlotsSection spellSlots={spellSlots} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
      )}
    </div>
  )
}

// ─── World of Darkness ────────────────────────────────────────────────────────

function WoDAttrCell({ attr, characterId, canEdit, onSaved, onDelete, max = 5 }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void
  onDelete?: (id: string) => void; max?: number
}) {
  return (
    <div className="py-2 border-b last:border-0 group" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-almendra text-[11px] text-saga-text leading-tight truncate" title={attr.attribute.name}>{attr.attribute.name}</span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {canEdit && onDelete && (
            <button onClick={() => onDelete(attr.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-saga-danger/60 hover:text-saga-danger"><X size={9} /></button>
          )}
          <span className="font-cinzel text-[11px] text-gold/70">{attr.value}</span>
        </div>
      </div>
      <WoDDots value={attr.value} max={max} editable={canEdit} attrId={attr.id} characterId={characterId} onSaved={onSaved} />
    </div>
  )
}

function WoDThreeColGrid({ cols, children }: { cols: { label: string; hint?: string }[]; children: React.ReactNode }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {cols.map(({ label, hint }) => (
          <div key={label} className="text-center">
            <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em]">{label}</p>
            {hint && <p className="text-[8px] text-saga-dim/50 mt-0.5">{hint}</p>}
            <div className="mt-1.5 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </div>
  )
}

function WoDCol({ items, characterId, canEdit, onSaved, onDelete, emptyHint }: {
  items: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void
  onDelete?: (id: string) => void; emptyHint?: string
}) {
  return (
    <div className="rounded-lg px-3 py-1 min-h-[60px]"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {items.length === 0
        ? <p className="text-[10px] text-saga-dim py-4 text-center italic">{emptyHint ?? '—'}</p>
        : items.map(attr => <WoDAttrCell key={attr.id} attr={attr} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />)
      }
    </div>
  )
}

function WoDHealthTrack({ attrs, characterId, canEdit, onSaved }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  const LEVELS = ['Ileso', 'Contundido (-0)', 'Machucado (-1)', 'Ferido (-1)', 'Espancado (-2)', 'Mutilado (-2)', 'Aleijado (-5)', 'Incapacitado']
  const healthAttr = attrs.find(a => a.attribute.name === 'Saúde' || a.attribute.name === 'Pontos de Vida')
  if (!healthAttr && attrs.filter(a => a.attribute.description?.includes('Físico')).length === 0) return null

  return (
    <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim mb-3 text-center">Saúde</p>
      <div className="space-y-1">
        {LEVELS.map((lvl, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] text-saga-muted flex-1">{lvl}</span>
            <div className="w-4 h-4 rounded border transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function WoDResourcesTab({ resources, characterId, canEdit, onSaved }: {
  resources: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  return (
    <div>
      <SectionDivider title="Recursos" />
      {resources.length === 0
        ? <p className="text-sm text-saga-dim text-center py-6">Nenhum recurso especial.</p>
        : (
          <div className="space-y-4">
            {resources.map(attr => {
              const desc = (attr.attribute.description ?? '').toLowerCase()
              const isSmall = desc.includes('1-5') || desc.includes('0-5') || desc.includes('fome')
              const max = isSmall ? 5 : 10
              return (
                <div key={attr.id} className="py-3 px-3 rounded"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-almendra text-sm text-saga-text">{attr.attribute.name}</span>
                    <span className="font-cinzel font-bold text-gold">{attr.value} / {max}</span>
                  </div>
                  <WoDDots value={attr.value} max={max} editable={canEdit} attrId={attr.id} characterId={characterId} onSaved={onSaved} />
                  {attr.attribute.description && (
                    <p className="text-[10px] text-saga-dim mt-2 leading-relaxed">{attr.attribute.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

// ─── Horror / CoC ─────────────────────────────────────────────────────────────

function CoCStatRow({ attr, characterId, canEdit, onSaved, onDelete }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void; onDelete: (id: string) => void
}) {
  const pct = isPercentile(attr)
  const half = Math.floor(attr.value / 2)
  const fifth = Math.floor(attr.value / 5)
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded group hover:bg-white/[0.015] transition-all">
      <div className="flex-1 min-w-0">
        <span className="text-sm">{attr.attribute.name}</span>
      </div>
      {canEdit
        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onSaved} className="font-cinzel font-bold text-base text-gold w-14 text-right" />
        : <span className="font-cinzel font-bold text-base text-gold">{pct ? `${attr.value}%` : attr.value}</span>
      }
      {pct && (
        <div className="flex gap-2 text-[10px] text-saga-dim font-mono">
          <span title="Metade">½{half}</span>
          <span title="Quinto">⅕{fifth}</span>
        </div>
      )}
      {!pct && <span className="text-[9px] text-saga-dim font-mono opacity-40 w-6">{attr.customDie ?? attr.attribute.defaultDie}</span>}
      {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
    </div>
  )
}

function CoCSkillGroup({ title, skills, characterId, canEdit, onSaved, onDelete }: {
  title: string; skills: Attr[]; characterId: string; canEdit: boolean
  onSaved: () => void; onDelete: (id: string) => void
}) {
  if (skills.length === 0) return null
  return (
    <div>
      <SectionDivider title={title} />
      <div className="space-y-0.5">
        {skills.map(attr => (
          <CoCStatRow key={attr.id} attr={attr} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

// ─── Generic / Sci-Fi ─────────────────────────────────────────────────────────

function GenericTab({ attrs, weapons, characterId, canEdit, onAdd, onDelete, onRefresh, systemName }: {
  attrs: Attr[]; weapons: Weapon[]; characterId: string; canEdit: boolean; onAdd: () => void
  onDelete: (id: string) => void; onRefresh: () => void; systemName: string | null
}) {
  const isBlades = systemName === 'Blades in the Dark'

  const content = isBlades ? (() => {
    const groups = groupByPrefix(attrs)
    return (
      <div className="space-y-6">
        {Object.entries(groups).map(([group, groupAttrs]) => (
          <div key={group}>
            <SectionDivider title={group} />
            <div className="space-y-1">
              {groupAttrs.map(attr => {
                const shortName = attr.attribute.name.includes(' — ') ? attr.attribute.name.split(' — ')[1]! : attr.attribute.name
                return (
                  <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded group hover:bg-white/[0.015] transition-all">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{shortName}</span>
                      {attr.attribute.description && <p className="text-[10px] text-saga-dim truncate">{attr.attribute.description}</p>}
                    </div>
                    {canEdit
                      ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="font-cinzel font-bold text-base text-gold w-10 text-center" />
                      : <span className="font-cinzel font-bold text-base text-gold">{attr.value}</span>
                    }
                    <span className="text-[9px] text-saga-dim font-mono opacity-40">{attr.customDie ?? attr.attribute.defaultDie}</span>
                    {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  })() : (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">Atributos</p>
        <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
        {canEdit && <AddBtn onClick={onAdd} />}
      </div>
      {attrs.length === 0
        ? <p className="text-sm text-saga-dim text-center py-6">{canEdit ? 'Nenhum atributo. Clique em "Adicionar".' : 'Nenhum atributo.'}</p>
        : (
          <div className="space-y-1">
            {attrs.map(attr => (
              <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded group hover:bg-white/[0.015] transition-all">
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{attr.attribute.name}</span>
                  {attr.attribute.description && <p className="text-[10px] text-saga-dim truncate">{attr.attribute.description}</p>}
                </div>
                {canEdit
                  ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={onRefresh} className="font-cinzel font-bold text-base text-gold w-10 text-center" />
                  : <span className="font-cinzel font-bold text-base text-gold">{attr.value}</span>
                }
                <span className="text-[9px] text-saga-dim font-mono opacity-40">{attr.customDie ?? attr.attribute.defaultDie}</span>
                {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )

  return (
    <div className="space-y-6">
      {content}
      <WeaponsSection weapons={weapons} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CharacterSheetView({ characterId, characterLevel, attributes, textFields, weapons, spellSlots, canEdit, canEditWeapons = canEdit, category, systemName }: Props) {
  const router = useRouter()

  // ── System-specific sheets (early return) ──
  if (systemName === 'Fate Core') {
    return <FateCoreSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} canEdit={canEdit} />
  }
  if (systemName === 'Vampire: The Masquerade V5') {
    return <VtMV5Sheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Blades in the Dark') {
    return <BitDSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} canEdit={canEdit} />
  }

  // WoD
  if (systemName === 'Vampire: The Masquerade V20' || systemName === 'Vampire: The Masquerade') {
    return <VtMV20Sheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Werewolf: The Apocalypse') {
    return <WerewolfSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Mage: The Ascension') {
    return <MageAscSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Mage: The Awakening') {
    return <MageAwkSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Hunter: The Reckoning') {
    return <HunterSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Changeling: The Lost') {
    return <ChangelingSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Demon: The Descent') {
    return <DemonSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  if (systemName === 'Geist: The Sin-Eaters') {
    return <GeistSheet characterId={characterId} attributes={attributes} textFields={textFields} weapons={weapons} canEdit={canEdit} />
  }
  // Horror
  if (systemName === 'Call of Cthulhu 7e') {
    return <CoC7eSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Delta Green') {
    return <DeltaGreenSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Mothership') {
    return <MothershipSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  // Sci-Fi / Cyberpunk
  if (systemName === 'Cyberpunk Red') {
    return <CyberpunkRedSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Starfinder') {
    return <StarfinderSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Shadowrun 6e') {
    return <Shadowrun6eSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Star Wars: Edge of the Empire') {
    return <StarWarsSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  // Generic
  if (systemName === 'GURPS 4e') {
    return <GURPSSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Savage Worlds') {
    return <SavageWorldsSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Ironsworn') {
    return <IronswornSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  // Fantasy
  if (systemName === 'D&D 3.5e') {
    return <DnD35Sheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Old Dragon 2') {
    return <DnD35Sheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Pathfinder 1e') {
    return <Pathfinder1eSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Pathfinder 2e') {
    return <Pathfinder2eSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Tormenta20') {
    return <Tormenta20Sheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === 'Dungeon World') {
    return <DungeonWorldSheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }
  if (systemName === '13th Age') {
    return <Age13Sheet characterId={characterId} characterLevel={characterLevel} attributes={attributes} textFields={textFields} weapons={weapons} spellSlots={spellSlots} canEdit={canEdit} />
  }

  const isDnD5e  = systemName === 'D&D 5e'
  const dnd      = isDnD5e ? groupDnD5e(attributes) : null
  const wod      = category === 'world-of-darkness' ? categorizeWoD(attributes) : null
  const hasSpells = ['D&D 5e', 'D&D 3.5e', 'Pathfinder 1e', 'Pathfinder 2e', 'Tormenta20', 'Old Dragon 2', '13th Age'].includes(systemName ?? '')

  // ── Tab definitions ──
  const tabs: { id: string; label: string; icon?: React.ElementType }[] = []

  if (isDnD5e) {
    tabs.push({ id: 'atributos',  label: 'Atributos',  icon: Shield })
    tabs.push({ id: 'pericias', label: 'Perícias' })
    tabs.push({ id: 'combate',    label: 'Combate',    icon: Sword })
    tabs.push({ id: 'magias',     label: 'Magias',     icon: Wand2 })
    tabs.push({ id: 'personagem', label: 'Personagem', icon: User })
  } else if (category === 'fantasy') {
    tabs.push({ id: 'atributos', label: 'Atributos' })
    tabs.push({ id: 'combate',   label: 'Combate' })
    tabs.push({ id: 'personagem', label: 'Personagem', icon: User })
  } else if (category === 'world-of-darkness') {
    tabs.push({ id: 'atributos', label: 'Atributos' })
    if (wod) {
      const hasAbilities = wod.talents.length + wod.skills.length + wod.knowledges.length + wod.physSkills.length + wod.socSkills.length + wod.menSkills.length > 0
      if (hasAbilities) tabs.push({ id: 'habilidades', label: 'Habilidades' })
      const hasAdvantages = wod.disciplines.length + wod.backgrounds.length + wod.virtues.length + wod.powers.length > 0
      if (hasAdvantages) tabs.push({ id: 'vantagens', label: 'Vantagens' })
      if (wod.resources.length > 0) tabs.push({ id: 'recursos', label: 'Recursos' })
    }
    tabs.push({ id: 'combate', label: 'Combate' })
    tabs.push({ id: 'personagem', label: 'Personagem', icon: User })
  } else if (category === 'horror') {
    tabs.push({ id: 'caracteristicas', label: 'Características' })
    tabs.push({ id: 'pericias', label: 'Perícias' })
    tabs.push({ id: 'combate',  label: 'Combate' })
    tabs.push({ id: 'personagem', label: 'Personagem', icon: User })
  } else {
    tabs.push({ id: 'atributos', label: 'Atributos' })
    tabs.push({ id: 'personagem', label: 'Personagem', icon: User })
  }

  const [activeTab, setActiveTab]   = useState(tabs[0]?.id ?? 'atributos')
  const [addOpen, setAddOpen]        = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const currentTab  = tabs.find(t => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'atributos')
  const targetAttr  = attributes.find(a => a.id === deleteTarget)

  function refresh() { router.refresh() }

  async function handleDelete(id: string) {
    setDeleteTarget(null)
    await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charAttributeId: id }),
    }).catch(() => null)
    router.refresh()
  }

  // Filter text fields — exclude internal death save keys
  const narrativeFields = textFields.filter(f => !['deathSuccesses', 'deathFailures'].includes(f.key))

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Tab bar */}
      <div className="flex flex-wrap border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}>
        {tabs.map(tab => {
          const isActive = tab.id === currentTab
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5"
              style={{ color: isActive ? '#c9a22a' : '#7878a0', background: isActive ? 'rgba(201,162,42,0.05)' : 'transparent' }}>
              {Icon && <Icon size={11} />}
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ background: 'linear-gradient(90deg, transparent, #c9a22a, transparent)' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-5 sm:p-6">

        {/* D&D 5e */}
        {isDnD5e && dnd && currentTab === 'atributos' && (
          <DnD5eAtributos dnd={dnd} characterId={characterId} canEdit={canEdit} level={characterLevel}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)} onRefresh={refresh} />
        )}
        {isDnD5e && dnd && currentTab === 'pericias' && (
          <DnD5ePericias dnd={dnd} characterId={characterId} canEdit={canEdit}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)} onRefresh={refresh} />
        )}
        {isDnD5e && dnd && currentTab === 'combate' && (
          <DnD5eCombate dnd={dnd} characterId={characterId} canEdit={canEdit} canEditWeapons={canEditWeapons} level={characterLevel}
            weapons={weapons} spellSlots={spellSlots} textFields={textFields}
            onDelete={id => setDeleteTarget(id)} onRefresh={refresh} />
        )}
        {isDnD5e && currentTab === 'magias' && (
          <DnD5eMagias spellSlots={spellSlots} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}
        {isDnD5e && currentTab === 'personagem' && (
          <DnD5ePersonagem textFields={narrativeFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}

        {/* Fantasy genérico */}
        {!isDnD5e && category === 'fantasy' && currentTab === 'atributos' && (
          <FantasyAttrTab attrs={attributes} characterId={characterId} canEdit={canEdit}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)} onRefresh={refresh} />
        )}
        {!isDnD5e && category === 'fantasy' && currentTab === 'combate' && (
          <FantasyCombateTab attrs={attributes} weapons={weapons} spellSlots={spellSlots} characterId={characterId}
            canEdit={canEdit} onDelete={id => setDeleteTarget(id)} onRefresh={refresh}
            level={characterLevel} showSpells={hasSpells} />
        )}
        {!isDnD5e && category === 'fantasy' && currentTab === 'personagem' && (
          <DnD5ePersonagem textFields={narrativeFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}

        {/* World of Darkness */}
        {category === 'world-of-darkness' && wod && currentTab === 'atributos' && (
          <WoDThreeColGrid cols={[{ label: 'Físico' }, { label: 'Social' }, { label: 'Mental' }]}>
            <WoDCol items={wod.physical} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
            <WoDCol items={wod.social}   characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
            <WoDCol items={wod.mental}   characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
          </WoDThreeColGrid>
        )}
        {category === 'world-of-darkness' && wod && currentTab === 'habilidades' && (() => {
          const useV20 = wod.talents.length + wod.skills.length + wod.knowledges.length > 0
          return (
            <div className="space-y-4">
              <WoDThreeColGrid cols={[
                { label: useV20 ? 'Talentos'      : 'Físicas' },
                { label: useV20 ? 'Perícias'      : 'Sociais' },
                { label: useV20 ? 'Conhecimentos' : 'Mentais' },
              ]}>
                <WoDCol items={useV20 ? wod.talents    : wod.physSkills} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} emptyHint="—" />
                <WoDCol items={useV20 ? wod.skills     : wod.socSkills}  characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} emptyHint="—" />
                <WoDCol items={useV20 ? wod.knowledges : wod.menSkills}  characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} emptyHint="—" />
              </WoDThreeColGrid>
              {canEdit && <div className="flex justify-end"><AddBtn onClick={() => setAddOpen(true)} /></div>}
            </div>
          )
        })()}
        {category === 'world-of-darkness' && wod && currentTab === 'vantagens' && (
          <div className="space-y-4">
            <WoDThreeColGrid cols={[
              { label: 'Disciplinas' },
              { label: 'Antecedentes' },
              { label: wod.virtues.length > 0 ? 'Virtudes' : systemName?.includes('Ascension') ? 'Esferas' : systemName?.includes('Awakening') ? 'Arcanos' : 'Poderes' },
            ]}>
              <WoDCol items={wod.disciplines} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} emptyHint="—" />
              <WoDCol items={wod.backgrounds} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} emptyHint="—" />
              <WoDCol items={wod.virtues.length > 0 ? [...wod.virtues, ...wod.powers] : wod.powers} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={wod.virtues.length === 0 ? id => setDeleteTarget(id) : undefined} />
            </WoDThreeColGrid>
            {canEdit && <div className="flex justify-end"><AddBtn onClick={() => setAddOpen(true)} /></div>}
          </div>
        )}
        {category === 'world-of-darkness' && wod && currentTab === 'recursos' && (
          <WoDResourcesTab resources={wod.resources} characterId={characterId} canEdit={canEdit} onSaved={refresh} />
        )}
        {category === 'world-of-darkness' && currentTab === 'combate' && (
          <WeaponsSection weapons={weapons} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}
        {category === 'world-of-darkness' && currentTab === 'personagem' && (
          <DnD5ePersonagem textFields={narrativeFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}

        {/* Horror / CoC */}
        {category === 'horror' && currentTab === 'caracteristicas' && (() => {
          const coC = groupCoC(attributes)
          return (
            <div className="space-y-6">
              <SectionDivider title="Características" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {coC.characteristics.map(attr => {
                  const half = Math.floor(attr.value / 2)
                  const fifth = Math.floor(attr.value / 5)
                  return (
                    <div key={attr.id}
                      className="flex flex-col items-center gap-1.5 py-4 px-1 rounded-lg border group transition-all hover:border-gold/25"
                      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <span className="font-cinzel text-2xl font-bold text-gold leading-none">
                        {canEdit
                          ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh} className="font-cinzel text-2xl font-bold text-gold w-14 text-center" />
                          : `${attr.value}%`
                        }
                      </span>
                      <div className="flex gap-2 text-[9px] text-saga-dim font-mono">
                        <span>½{half}</span><span>⅕{fifth}</span>
                      </div>
                      <div className="w-8 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
                      <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest text-center">
                        {ATTR_ABBREV[attr.attribute.name] ?? attr.attribute.name.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
              {coC.derived.length > 0 && (
                <div>
                  <SectionDivider title="Atributos Derivados" />
                  {coC.derived.map(attr => (
                    <CoCStatRow key={attr.id} attr={attr} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}
        {category === 'horror' && currentTab === 'pericias' && (() => {
          const coC = groupCoC(attributes)
          return (
            <div className="space-y-4">
              {canEdit && <div className="flex justify-end"><AddBtn onClick={() => setAddOpen(true)} /></div>}
              <CoCSkillGroup title="Combate"      skills={coC.combat}      characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
              <CoCSkillGroup title="Exploração"   skills={coC.exploration}  characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
              <CoCSkillGroup title="Técnicas"     skills={coC.technical}   characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
              <CoCSkillGroup title="Conhecimento" skills={coC.knowledge}   characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
              <CoCSkillGroup title="Social"       skills={coC.social}      characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
              <CoCSkillGroup title="Percepção e Arte" skills={[...coC.perception, ...coC.other]} characterId={characterId} canEdit={canEdit} onSaved={refresh} onDelete={id => setDeleteTarget(id)} />
            </div>
          )
        })()}
        {category === 'horror' && currentTab === 'combate' && (
          <div className="space-y-6">
            <WeaponsSection weapons={weapons} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
          </div>
        )}
        {category === 'horror' && currentTab === 'personagem' && (
          <DnD5ePersonagem textFields={narrativeFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}

        {/* Sci-Fi / Generic / Custom */}
        {(category === 'scifi' || category === 'generic' || category === 'custom') && currentTab === 'atributos' && (
          <GenericTab attrs={attributes} weapons={weapons} characterId={characterId} canEdit={canEdit}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)} onRefresh={refresh} systemName={systemName} />
        )}
        {(category === 'scifi' || category === 'generic' || category === 'custom') && currentTab === 'personagem' && (
          <DnD5ePersonagem textFields={narrativeFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />
        )}
      </div>

      {canEdit && (
        <>
          <AddAttributeModal characterId={characterId} open={addOpen} onClose={() => setAddOpen(false)} />
          <ConfirmModal
            open={!!deleteTarget}
            variant="warning"
            title={`Remover ${targetAttr?.attribute.name ?? 'atributo'}?`}
            description="O atributo será removido da ficha permanentemente."
            confirmLabel="Remover"
            cancelLabel="Cancelar"
            onConfirm={() => deleteTarget && void handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
          />
        </>
      )}
    </div>
  )
}
