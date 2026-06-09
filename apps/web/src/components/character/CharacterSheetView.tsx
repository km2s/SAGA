'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddAttributeModal } from './AddAttributeModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { X, Plus } from 'lucide-react'

export type SheetCategory = 'fantasy' | 'world-of-darkness' | 'horror' | 'scifi' | 'generic' | 'custom'

interface Attr {
  id: string
  value: number
  customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}

interface Props {
  characterId: string
  characterLevel: number
  attributes: Attr[]
  canEdit: boolean
  category: SheetCategory
  systemName: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ATTR_ABBREV: Record<string, string> = {
  'Força': 'FOR', 'Destreza': 'DES', 'Constituição': 'CON', 'Inteligência': 'INT',
  'Sabedoria': 'SAB', 'Carisma': 'CAR', 'Percepção': 'PER', 'Vigor': 'VIG',
  'Tamanho': 'TAM', 'Aparência': 'APR', 'Poder': 'POD', 'Educação': 'EDU',
  'Manipulação': 'MAN', 'Compostura': 'COM', 'Determinação': 'DET',
  'Raciocínio': 'RAC', 'Presença': 'PRE', 'Sanidade': 'SAN', 'Saúde': 'SAU',
}

const FANTASY_CORE = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']

const COMBAT_NAMES = new Set([
  'CA', 'Classe de Armadura', 'Iniciativa', 'Velocidade', 'Proficiência',
  'Bônus de Proficiência', 'Ataque', 'Dano', 'Alcance',
])

function dndMod(value: number) {
  const m = Math.floor((value - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function isPercentile(attr: Attr) {
  return (attr.customDie ?? attr.attribute.defaultDie) === 'd100'
}

function categorizeWoD(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  // V20-style abilities
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  // V5-style skills (by attribute category)
  const physSkills: Attr[] = [], socSkills: Attr[] = [], menSkills: Attr[] = []
  // Common advantages
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
  return {
    physical, social, mental,
    talents, skills, knowledges,
    physSkills, socSkills, menSkills,
    disciplines, backgrounds, virtues,
    powers, resources,
  }
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

// ─── Atoms ───────────────────────────────────────────────────────────────────

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
    <span
      className={`cursor-pointer hover:text-gold transition-colors ${className ?? ''}`}
      onClick={() => { setEditing(true); setVal(String(value)) }}
    >
      {saving ? '…' : value}
    </span>
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
        <button
          key={i}
          onClick={() => void handleClick(i)}
          disabled={!editable}
          className="rounded-full border flex-shrink-0 transition-all"
          style={{
            width: 11, height: 11,
            background: i < value ? '#c9a22a' : 'transparent',
            borderColor: i < value ? '#c9a22a' : 'rgba(255,255,255,0.15)',
            cursor: editable ? 'pointer' : 'default',
          }}
        />
      ))}
    </div>
  )
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
    </div>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded border border-saga-danger/30 text-saga-danger hover:bg-saga-danger/10 flex-shrink-0"
    >
      <X size={10} />
    </button>
  )
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0"
      style={{ background: 'rgba(201,162,42,0.08)', border: '1px solid rgba(201,162,42,0.3)', color: '#c9a22a' }}
    >
      <Plus size={9} />
      Adicionar
    </button>
  )
}

// ─── Fantasy ─────────────────────────────────────────────────────────────────

function FantasyAttrTab({ attrs, characterId, canEdit, onAdd, onDelete }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onAdd: () => void; onDelete: (id: string) => void
}) {
  const router = useRouter()
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
                <div
                  key={attr.id}
                  className="flex flex-col items-center gap-2 py-5 px-1 rounded-lg border group transition-all hover:border-gold/25"
                  style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <span className={`font-cinzel text-3xl font-bold leading-none ${pos ? 'text-gold' : 'text-saga-danger'}`}>
                    {mod}
                  </span>
                  <div className="w-8 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
                  {canEdit ? (
                    <EditableVal
                      attrId={attr.id} value={attr.value} characterId={characterId}
                      onSaved={() => router.refresh()}
                      className="text-sm text-saga-muted w-10 text-center"
                    />
                  ) : (
                    <span className="text-sm text-saga-muted">{attr.value}</span>
                  )}
                  <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest">
                    {ATTR_ABBREV[attr.attribute.name] ?? attr.attribute.name.slice(0, 3).toUpperCase()}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => onDelete(attr.id)}
                      className="hidden group-hover:block text-[8px] text-saga-danger/50 hover:text-saga-danger transition-colors"
                    >remover</button>
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
          canEdit ? (
            <button
              onClick={onAdd}
              className="w-full py-4 rounded border border-dashed text-sm text-saga-dim hover:text-saga-muted transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              + Adicionar atributo extra
            </button>
          ) : core.length > 0 ? null : (
            <p className="text-sm text-saga-dim text-center py-6">Nenhum atributo.</p>
          )
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
                  {canEdit ? (
                    <EditableVal
                      attrId={attr.id} value={attr.value} characterId={characterId}
                      onSaved={() => router.refresh()}
                      className="text-sm text-saga-muted w-10 text-center"
                    />
                  ) : (
                    <span className="text-sm text-saga-muted">{attr.value}</span>
                  )}
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

function FantasyCombatTab({ attrs, characterId, canEdit, onDelete, level }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onDelete: (id: string) => void; level: number
}) {
  const router = useRouter()
  const combatAttrs = attrs.filter(a => COMBAT_NAMES.has(a.attribute.name))
  const dex = attrs.find(a => a.attribute.name === 'Destreza')
  const dexMod = dex ? Math.floor((dex.value - 10) / 2) : null
  const iniciativa = dexMod !== null ? (dexMod >= 0 ? `+${dexMod}` : `${dexMod}`) : '—'
  const profBonus = `+${Math.ceil(level / 4) + 1}`

  return (
    <div className="space-y-6">
      <div>
        <SectionDivider title="Valores Calculados" />
        <div className="grid grid-cols-2 gap-3">
          <div
            className="text-center py-5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="font-cinzel text-3xl font-bold text-gold">{iniciativa}</p>
            <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest mt-2">Iniciativa</p>
            {dex && <p className="text-[9px] text-saga-dim/50 mt-0.5">de Destreza {dex.value}</p>}
          </div>
          <div
            className="text-center py-5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="font-cinzel text-3xl font-bold text-gold">{profBonus}</p>
            <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest mt-2">Proficiência</p>
            <p className="text-[9px] text-saga-dim/50 mt-0.5">nível {level}</p>
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
                {canEdit ? (
                  <EditableVal
                    attrId={attr.id} value={attr.value} characterId={characterId}
                    onSaved={() => router.refresh()}
                    className="font-cinzel font-bold text-lg text-gold w-10 text-center"
                  />
                ) : (
                  <span className="font-cinzel font-bold text-lg text-gold">{attr.value}</span>
                )}
                {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {combatAttrs.length === 0 && (
        <p className="text-[11px] text-saga-dim text-center py-2 leading-relaxed">
          Adicione atributos como "CA" ou "Velocidade" na aba Atributos para exibi-los aqui.
        </p>
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
        <span className="font-almendra text-[11px] text-saga-text leading-tight truncate" title={attr.attribute.name}>
          {attr.attribute.name}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {canEdit && onDelete && (
            <button onClick={() => onDelete(attr.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-saga-danger/60 hover:text-saga-danger">
              <X size={9} />
            </button>
          )}
          <span className="font-cinzel text-[11px] text-gold/70">{attr.value}</span>
        </div>
      </div>
      <WoDDots value={attr.value} max={max} editable={canEdit}
        attrId={attr.id} characterId={characterId} onSaved={onSaved} />
    </div>
  )
}

// Shared 3-column grid used for Attributes, Abilities, and Advantages
function WoDThreeColGrid({ cols, children }: {
  cols: { label: string; hint?: string }[]
  children: React.ReactNode
}) {
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
      {items.length === 0 ? (
        <p className="text-[10px] text-saga-dim py-4 text-center italic">{emptyHint ?? '—'}</p>
      ) : (
        items.map(attr => (
          <WoDAttrCell key={attr.id} attr={attr} characterId={characterId}
            canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
        ))
      )}
    </div>
  )
}

function WoDAttrTab({ physical, social, mental, characterId, canEdit, onSaved, onDelete }: {
  physical: Attr[]; social: Attr[]; mental: Attr[]
  characterId: string; canEdit: boolean; onSaved: () => void; onDelete: (id: string) => void
}) {
  return (
    <WoDThreeColGrid cols={[{ label: 'Físico' }, { label: 'Social' }, { label: 'Mental' }]}>
      <WoDCol items={physical} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
      <WoDCol items={social}   characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
      <WoDCol items={mental}   characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
    </WoDThreeColGrid>
  )
}

function WoDAbilitiesTab({ col1, col2, col3, col1Label, col2Label, col3Label, characterId, canEdit, onSaved, onAdd, onDelete }: {
  col1: Attr[]; col2: Attr[]; col3: Attr[]
  col1Label: string; col2Label: string; col3Label: string
  characterId: string; canEdit: boolean; onSaved: () => void
  onAdd: () => void; onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <WoDThreeColGrid cols={[{ label: col1Label }, { label: col2Label }, { label: col3Label }]}>
        <WoDCol items={col1} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} emptyHint="—" />
        <WoDCol items={col2} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} emptyHint="—" />
        <WoDCol items={col3} characterId={characterId} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} emptyHint="—" />
      </WoDThreeColGrid>
      {canEdit && (
        <div className="flex justify-end">
          <AddBtn onClick={onAdd} />
        </div>
      )}
    </div>
  )
}

function WoDAdvantagesTab({ disciplines, backgrounds, virtues, powers, characterId, canEdit, onSaved, onAdd, onDelete, systemName }: {
  disciplines: Attr[]; backgrounds: Attr[]; virtues: Attr[]; powers: Attr[]
  characterId: string; canEdit: boolean; onSaved: () => void
  onAdd: () => void; onDelete: (id: string) => void; systemName: string | null
}) {
  const rightLabel =
    virtues.length > 0 ? 'Virtudes' :
    systemName?.includes('Ascension') ? 'Esferas' :
    systemName?.includes('Awakening') ? 'Arcanos' : 'Poderes'
  const rightItems = virtues.length > 0 ? [...virtues, ...powers] : powers

  return (
    <div className="space-y-4">
      <WoDThreeColGrid cols={[
        { label: 'Disciplinas', hint: canEdit ? 'prefixo: Disciplina —' : undefined },
        { label: 'Antecedentes', hint: canEdit ? 'prefixo: Antecedente —' : undefined },
        { label: rightLabel },
      ]}>
        <WoDCol items={disciplines} characterId={characterId} canEdit={canEdit} onSaved={onSaved}
          onDelete={onDelete} emptyHint={canEdit ? 'Adicione via botão abaixo' : '—'} />
        <WoDCol items={backgrounds} characterId={characterId} canEdit={canEdit} onSaved={onSaved}
          onDelete={onDelete} emptyHint={canEdit ? 'Adicione via botão abaixo' : '—'} />
        <WoDCol items={rightItems} characterId={characterId} canEdit={canEdit} onSaved={onSaved}
          onDelete={virtues.length === 0 ? onDelete : undefined} />
      </WoDThreeColGrid>
      {canEdit && (
        <div className="flex justify-end">
          <AddBtn onClick={onAdd} />
        </div>
      )}
    </div>
  )
}


function WoDResourcesTab({ resources, characterId, canEdit, onSaved }: {
  resources: Attr[]; characterId: string; canEdit: boolean; onSaved: () => void
}) {
  return (
    <div>
      <SectionDivider title="Recursos" />
      {resources.length === 0 ? (
        <p className="text-sm text-saga-dim text-center py-6">Nenhum recurso especial.</p>
      ) : (
        <div className="space-y-4">
          {resources.map(attr => {
            const desc = (attr.attribute.description ?? '').toLowerCase()
            const isSmall = desc.includes('1-5') || desc.includes('0-5') || desc.includes('fome')
            const max = isSmall ? 5 : 10
            return (
              <div key={attr.id} className="py-3 px-3 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
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
      )}
    </div>
  )
}

// ─── Horror ───────────────────────────────────────────────────────────────────

function HorrorTab({ attrs, characterId, canEdit, onAdd, onDelete }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onAdd: () => void; onDelete: (id: string) => void
}) {
  const router = useRouter()

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">Características</p>
        <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
        {canEdit && <AddBtn onClick={onAdd} />}
      </div>

      {attrs.length === 0 ? (
        <p className="text-sm text-saga-dim text-center py-6">
          {canEdit ? 'Nenhum atributo. Clique em "Adicionar".' : 'Nenhum atributo.'}
        </p>
      ) : (
        <div className="space-y-1">
          {attrs.map(attr => {
            const pct = isPercentile(attr)
            const half = Math.floor(attr.value / 2)
            const fifth = Math.floor(attr.value / 5)
            return (
              <div key={attr.id} className="flex items-center gap-3 py-3 px-2 rounded group hover:bg-white/[0.015] transition-all">
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{attr.attribute.name}</span>
                </div>
                {canEdit ? (
                  <EditableVal
                    attrId={attr.id} value={attr.value} characterId={characterId}
                    onSaved={() => router.refresh()}
                    className={`font-cinzel font-bold text-base text-gold w-14 text-right ${pct ? '' : 'text-center'}`}
                  />
                ) : (
                  <span className="font-cinzel font-bold text-base text-gold">
                    {pct ? `${attr.value}%` : attr.value}
                  </span>
                )}
                {pct && (
                  <div className="flex gap-3 text-[10px] text-saga-dim font-mono">
                    <span>½ {half}</span>
                    <span>⅕ {fifth}</span>
                  </div>
                )}
                <span className="text-[9px] text-saga-dim font-mono opacity-40">{attr.customDie ?? attr.attribute.defaultDie}</span>
                {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sci-Fi / Generic / Custom ────────────────────────────────────────────────

function GenericTab({ attrs, characterId, canEdit, onAdd, onDelete, systemName }: {
  attrs: Attr[]; characterId: string; canEdit: boolean; onAdd: () => void
  onDelete: (id: string) => void; systemName: string | null
}) {
  const router = useRouter()
  const isBlades = systemName === 'Blades in the Dark'

  if (isBlades) {
    const groups = groupByPrefix(attrs)
    return (
      <div className="space-y-6">
        {Object.entries(groups).map(([group, groupAttrs]) => (
          <div key={group}>
            <SectionDivider title={group} />
            <div className="space-y-1">
              {groupAttrs.map(attr => {
                const shortName = attr.attribute.name.includes(' — ')
                  ? attr.attribute.name.split(' — ')[1]!
                  : attr.attribute.name
                return (
                  <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded group hover:bg-white/[0.015] transition-all">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{shortName}</span>
                      {attr.attribute.description && (
                        <p className="text-[10px] text-saga-dim truncate">{attr.attribute.description}</p>
                      )}
                    </div>
                    {canEdit ? (
                      <EditableVal
                        attrId={attr.id} value={attr.value} characterId={characterId}
                        onSaved={() => router.refresh()}
                        className="font-cinzel font-bold text-base text-gold w-10 text-center"
                      />
                    ) : (
                      <span className="font-cinzel font-bold text-base text-gold">{attr.value}</span>
                    )}
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
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">Atributos</p>
        <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
        {canEdit && <AddBtn onClick={onAdd} />}
      </div>

      {attrs.length === 0 ? (
        <p className="text-sm text-saga-dim text-center py-6">
          {canEdit ? 'Nenhum atributo. Clique em "Adicionar".' : 'Nenhum atributo.'}
        </p>
      ) : (
        <div className="space-y-1">
          {attrs.map(attr => (
            <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded group hover:bg-white/[0.015] transition-all">
              <div className="flex-1 min-w-0">
                <span className="text-sm">{attr.attribute.name}</span>
                {attr.attribute.description && (
                  <p className="text-[10px] text-saga-dim truncate">{attr.attribute.description}</p>
                )}
              </div>
              {canEdit ? (
                <EditableVal
                  attrId={attr.id} value={attr.value} characterId={characterId}
                  onSaved={() => router.refresh()}
                  className="font-cinzel font-bold text-base text-gold w-10 text-center"
                />
              ) : (
                <span className="font-cinzel font-bold text-base text-gold">{attr.value}</span>
              )}
              <span className="text-[9px] text-saga-dim font-mono opacity-40">{attr.customDie ?? attr.attribute.defaultDie}</span>
              {canEdit && <DeleteBtn onClick={() => onDelete(attr.id)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CharacterSheetView({ characterId, characterLevel, attributes, canEdit, category, systemName }: Props) {
  const router = useRouter()

  const wod = category === 'world-of-darkness' ? categorizeWoD(attributes) : null

  // Build tab list per category
  const tabs: { id: string; label: string }[] = []
  if (category === 'fantasy') {
    tabs.push({ id: 'atributos', label: 'Atributos' })
    tabs.push({ id: 'combate', label: 'Combate' })
  } else if (category === 'world-of-darkness') {
    tabs.push({ id: 'atributos', label: 'Atributos' })
    if (wod) {
      const hasAbilities =
        wod.talents.length + wod.skills.length + wod.knowledges.length +
        wod.physSkills.length + wod.socSkills.length + wod.menSkills.length > 0
      if (hasAbilities) tabs.push({ id: 'habilidades', label: 'Habilidades' })

      const hasAdvantages =
        wod.disciplines.length + wod.backgrounds.length +
        wod.virtues.length + wod.powers.length > 0
      if (hasAdvantages) tabs.push({ id: 'vantagens', label: 'Vantagens' })

      if (wod.resources.length > 0) tabs.push({ id: 'recursos', label: 'Recursos' })
    }
  } else if (category === 'horror') {
    tabs.push({ id: 'caracteristicas', label: 'Características' })
  } else {
    tabs.push({ id: 'atributos', label: 'Atributos' })
  }

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'atributos')
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const currentTab = tabs.find(t => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'atributos')
  const targetAttr = attributes.find(a => a.id === deleteTarget)

  async function handleDelete(id: string) {
    setDeleteTarget(null)
    await fetch(`/api/characters/${characterId}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charAttributeId: id }),
    }).catch(() => null)
    router.refresh()
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Tab bar */}
      <div
        className="flex border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === currentTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-5 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{
                color: isActive ? '#c9a22a' : '#7878a0',
                background: isActive ? 'rgba(201,162,42,0.05)' : 'transparent',
              }}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ background: 'linear-gradient(90deg, transparent, #c9a22a, transparent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-5 sm:p-6">
        {currentTab === 'atributos' && category === 'fantasy' && (
          <FantasyAttrTab
            attrs={attributes} characterId={characterId} canEdit={canEdit}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)}
          />
        )}

        {currentTab === 'combate' && category === 'fantasy' && (
          <FantasyCombatTab
            attrs={attributes} characterId={characterId} canEdit={canEdit}
            onDelete={id => setDeleteTarget(id)} level={characterLevel}
          />
        )}

        {currentTab === 'atributos' && category === 'world-of-darkness' && wod && (
          <WoDAttrTab
            physical={wod.physical} social={wod.social} mental={wod.mental}
            characterId={characterId} canEdit={canEdit} onSaved={() => router.refresh()}
            onDelete={id => setDeleteTarget(id)}
          />
        )}

        {currentTab === 'habilidades' && category === 'world-of-darkness' && wod && (() => {
          const useV20 = wod.talents.length + wod.skills.length + wod.knowledges.length > 0
          return (
            <WoDAbilitiesTab
              col1={useV20 ? wod.talents   : wod.physSkills}
              col2={useV20 ? wod.skills    : wod.socSkills}
              col3={useV20 ? wod.knowledges: wod.menSkills}
              col1Label={useV20 ? 'Talentos'     : 'Físicas'}
              col2Label={useV20 ? 'Perícias'     : 'Sociais'}
              col3Label={useV20 ? 'Conhecimentos': 'Mentais'}
              characterId={characterId} canEdit={canEdit}
              onSaved={() => router.refresh()}
              onAdd={() => setAddOpen(true)}
              onDelete={id => setDeleteTarget(id)}
            />
          )
        })()}

        {currentTab === 'vantagens' && category === 'world-of-darkness' && wod && (
          <WoDAdvantagesTab
            disciplines={wod.disciplines} backgrounds={wod.backgrounds}
            virtues={wod.virtues} powers={wod.powers}
            characterId={characterId} canEdit={canEdit}
            onSaved={() => router.refresh()}
            onAdd={() => setAddOpen(true)}
            onDelete={id => setDeleteTarget(id)}
            systemName={systemName}
          />
        )}

        {currentTab === 'recursos' && category === 'world-of-darkness' && wod && (
          <WoDResourcesTab
            resources={wod.resources} characterId={characterId} canEdit={canEdit}
            onSaved={() => router.refresh()}
          />
        )}

        {currentTab === 'caracteristicas' && category === 'horror' && (
          <HorrorTab
            attrs={attributes} characterId={characterId} canEdit={canEdit}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)}
          />
        )}

        {currentTab === 'atributos' && (category === 'scifi' || category === 'generic' || category === 'custom') && (
          <GenericTab
            attrs={attributes} characterId={characterId} canEdit={canEdit}
            onAdd={() => setAddOpen(true)} onDelete={id => setDeleteTarget(id)}
            systemName={systemName}
          />
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
