'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Dices } from 'lucide-react'

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
  characterLevel: number
  attributes: Attr[]
  textFields: TextField[]
  canEdit: boolean
}

// ── Estrutura de ações do BitD ────────────────────────────────────────────────

const ACTIONS = {
  Insight: [
    { key: 'hunt',   label: 'Caçar (Hunt)' },
    { key: 'study',  label: 'Estudar (Study)' },
    { key: 'survey', label: 'Observar (Survey)' },
    { key: 'tinker', label: 'Inventar (Tinker)' },
  ],
  Prowess: [
    { key: 'finesse',  label: 'Finesse' },
    { key: 'prowl',    label: 'Esgueirar (Prowl)' },
    { key: 'skirmish', label: 'Escaramuça (Skirmish)' },
    { key: 'wreck',    label: 'Destruir (Wreck)' },
  ],
  Resolve: [
    { key: 'attune',  label: 'Sintonizar (Attune)' },
    { key: 'command', label: 'Comandar (Command)' },
    { key: 'consort', label: 'Relacionar (Consort)' },
    { key: 'sway',    label: 'Persuadir (Sway)' },
  ],
}

const ATTR_COLORS: Record<string, string> = {
  Insight:  '#3b82f6',
  Prowess:  '#22c55e',
  Resolve:  '#8b5cf6',
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

function saveTextField(characterId: string, key: string, label: string, value: string) {
  return fetch(`/api/characters/${characterId}/text-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, label, value }),
  }).catch(() => null)
}

// ── Bolinhas de ação (0–4 dados) ──────────────────────────────────────────────

function ActionDots({ attr, characterId, canEdit, onSaved, color }: {
  attr: Attr; characterId: string; canEdit: boolean; onSaved: () => void; color: string
}) {
  async function click(i: number) {
    if (!canEdit) return
    const newVal = i + 1 === attr.value ? i : i + 1
    await fetch(`/api/characters/${characterId}/attributes/${attr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newVal }),
    }).catch(() => null)
    onSaved()
  }

  return (
    <div className="flex gap-[5px] items-center">
      {[0, 1, 2, 3].map(i => (
        <button key={i} onClick={() => void click(i)} disabled={!canEdit}
          className="rounded-full border flex-shrink-0 transition-all"
          style={{
            width: 11, height: 11,
            background: i < attr.value ? color : 'transparent',
            borderColor: i < attr.value ? color : 'rgba(51,41,29,0.2)',
            cursor: canEdit ? 'pointer' : 'default',
          }} />
      ))}
    </div>
  )
}

// ── XP Trigger checkbox ───────────────────────────────────────────────────────

function XPBox({ tfKey, textFields, characterId, canEdit, onRefresh }: {
  tfKey: string; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const field = textFields.find(f => f.key === tfKey)
  const checked = field?.value === '1'

  async function toggle() {
    if (!canEdit) return
    await saveTextField(characterId, tfKey, tfKey, checked ? '0' : '1')
    onRefresh()
  }

  return (
    <button onClick={() => void toggle()} disabled={!canEdit}
      className="w-3.5 h-3.5 rounded border transition-all flex-shrink-0"
      title="XP trigger"
      style={{
        background: checked ? '#c9a22a' : 'transparent',
        borderColor: checked ? '#c9a22a' : 'rgba(51,41,29,0.2)',
        cursor: canEdit ? 'pointer' : 'default',
      }} />
  )
}

// ── Ações tab ─────────────────────────────────────────────────────────────────

function ActionsTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  // Build a name→attr lookup
  const attrByKey: Record<string, Attr> = {}
  for (const a of attributes) {
    const key = a.attribute.name.toLowerCase().replace(/[^a-z]/g, '').replace('esgueirar', 'prowl').replace('caçar', 'hunt').replace('estudar', 'study').replace('observar', 'survey').replace('inventar', 'tinker').replace('destruir', 'wreck').replace('escaramuça', 'skirmish').replace('sintonizar', 'attune').replace('comandar', 'command').replace('relacionar', 'consort').replace('persuadir', 'sway').replace('finesse', 'finesse')
    attrByKey[key] = a
    // Also try exact description prefix matching
    const desc = a.attribute.description?.toLowerCase() ?? ''
    if (desc.includes('insight')) {
      const actions = ['hunt', 'study', 'survey', 'tinker']
      for (const ac of actions) {
        if (a.attribute.name.toLowerCase().includes(ac)) attrByKey[ac] = a
      }
    }
    if (desc.includes('prowess')) {
      const actions = ['finesse', 'prowl', 'skirmish', 'wreck']
      for (const ac of actions) {
        if (a.attribute.name.toLowerCase().includes(ac)) attrByKey[ac] = a
      }
    }
    if (desc.includes('resolve')) {
      const actions = ['attune', 'command', 'consort', 'sway']
      for (const ac of actions) {
        if (a.attribute.name.toLowerCase().includes(ac)) attrByKey[ac] = a
      }
    }
  }
  // Fallback: match by action key in attribute name
  for (const a of attributes) {
    const name = a.attribute.name.toLowerCase()
    for (const [group, actions] of Object.entries(ACTIONS)) {
      for (const action of actions) {
        if (name.includes(action.key) && !attrByKey[action.key]) {
          attrByKey[action.key] = a
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {Object.entries(ACTIONS).map(([groupName, actions]) => {
        const color = ATTR_COLORS[groupName] ?? '#c9a22a'
        // Group rating = max of individual action ratings
        const groupRating = Math.max(...actions.map(a => attrByKey[a.key]?.value ?? 0), 0)

        return (
          <div key={groupName}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-cinzel text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                {groupName}
              </span>
              <span className="text-[10px] text-ink-soft">{groupRating} dado{groupRating !== 1 ? 's' : ''} de atributo</span>
              <div className="flex-1 h-px" style={{ background: `${color}20` }} />
              <span className="text-[9px] text-ink-soft/50">XP</span>
            </div>

            <div className="space-y-1 rounded p-2"
              style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.05)' }}>
              {actions.map(action => {
                const attr = attrByKey[action.key]
                const value = attr?.value ?? 0

                return (
                  <div key={action.key} className="flex items-center gap-3 py-2 px-1">
                    <XPBox tfKey={`xp_${action.key}`} textFields={textFields}
                      characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
                    <span className="flex-1 text-sm text-ink">{action.label}</span>
                    {attr
                      ? <ActionDots attr={attr} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} color={color} />
                      : (
                        <div className="flex gap-[5px] items-center opacity-30">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className="rounded-full border flex-shrink-0"
                              style={{ width: 11, height: 11, borderColor: 'rgba(51,41,29,0.2)' }} />
                          ))}
                        </div>
                      )
                    }
                    <div className="flex items-center gap-1 ml-1">
                      <Dices size={10} className="text-ink-soft/50" />
                      <span className="font-cinzel text-[10px]" style={{ color: value > 0 ? color : '#4a4a6a' }}>
                        {value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── CoinTrack ─────────────────────────────────────────────────────────────────

function CoinTrack({ value, max, label, onSet, canEdit }: {
  value: number; max: number; label: string; onSet: (v: number) => void; canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  function save() {
    const n = parseInt(val)
    if (!isNaN(n)) onSet(Math.max(0, Math.min(max, n)))
    setEditing(false)
  }
  return (
    <div className="flex items-center gap-2">
      {editing && canEdit
        ? <input autoFocus type="number" value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            className="w-16 bg-parchment/60 border border-gold/40 rounded text-center font-bold text-lg focus:outline-none text-ink" />
        : <span className="font-cinzel font-bold text-2xl text-ink cursor-pointer hover:text-amber-400 transition-colors"
            onClick={() => { if (canEdit) { setEditing(true); setVal(String(value)) } }}>
            {value}
          </span>
      }
      <span className="text-ink-soft text-sm">{label}</span>
    </div>
  )
}

// ── Estado tab — Stress, Harm, Armor, Load ─────────────────────────────────────

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onChange}
        className="rounded border transition-all flex-shrink-0"
        style={{
          width: 16, height: 16,
          background: checked ? '#c9a22a' : 'transparent',
          borderColor: checked ? '#c9a22a' : 'rgba(51,41,29,0.2)',
        }} />
      {label && <span className="text-[11px] text-ink-soft">{label}</span>}
    </div>
  )
}

function StateTab({ attributes, textFields, characterId, canEdit, onRefresh }: {
  attributes: Attr[]; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  // Stress attr
  const stressAttr = attributes.find(a => ['Estresse', 'Stress'].some(n => a.attribute.name.includes(n)))
  const stress = stressAttr?.value ?? 0
  const MAX_STRESS = 9

  async function setStress(v: number) {
    if (!stressAttr || !canEdit) return
    await fetch(`/api/characters/${characterId}/attributes/${stressAttr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: Math.max(0, Math.min(MAX_STRESS, v)) }),
    }).catch(() => null)
    onRefresh()
  }

  // Trauma
  const traumaField = textFields.find(f => f.key === 'trauma')

  // Harm — 4 levels with 2 boxes each for levels 1-2, 1 box for level 3, "dead" for level 4
  const HARM_KEYS = [
    { key: 'harm1a', label: 'Dano Menor 1' },
    { key: 'harm1b', label: 'Dano Menor 2' },
    { key: 'harm2a', label: 'Dano Moderado 1' },
    { key: 'harm2b', label: 'Dano Moderado 2' },
    { key: 'harm3',  label: 'Dano Grave' },
    { key: 'harm4',  label: 'Fatal' },
  ]

  // Armor
  const armorField = textFields.find(f => f.key === 'armor')
  const armorUsed = (armorField?.value ?? '0,0,0').split(',')
  const [armor1, armor2, armorSpecial] = [armorUsed[0] === '1', armorUsed[1] === '1', armorUsed[2] === '1']

  async function toggleArmor(i: number) {
    if (!canEdit) return
    const bits = [...(armorUsed.length >= 3 ? armorUsed : ['0', '0', '0'])]
    bits[i] = bits[i] === '1' ? '0' : '1'
    await saveTextField(characterId, 'armor', 'Armadura', bits.join(','))
    onRefresh()
  }

  // Load
  const loadField = textFields.find(f => f.key === 'load')
  const load = loadField?.value ?? 'Normal'

  async function setLoad(v: string) {
    if (!canEdit) return
    await saveTextField(characterId, 'load', 'Carga', v)
    onRefresh()
  }

  async function setHarmField(key: string, value: string) {
    await saveTextField(characterId, key, key, value)
    onRefresh()
  }

  return (
    <div className="space-y-5">
      {/* Estresse */}
      <div className="rounded p-4" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft">Estresse</p>
          <div className="flex items-center gap-2">
            {canEdit && <button onClick={() => void setStress(stress - 1)} className="w-5 h-5 rounded text-ink-soft hover:text-gold">−</button>}
            <span className="font-cinzel font-bold text-gold">{stress} / {MAX_STRESS}</span>
            {canEdit && <button onClick={() => void setStress(stress + 1)} className="w-5 h-5 rounded text-ink-soft hover:text-gold">+</button>}
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: MAX_STRESS }).map((_, i) => (
            <button key={i} onClick={() => canEdit && void setStress(i < stress ? i : i + 1)}
              disabled={!canEdit}
              className="rounded border transition-all flex-shrink-0"
              style={{
                width: 18, height: 18,
                background: i < stress ? (stress >= MAX_STRESS ? '#ef4444' : '#c9a22a') : 'transparent',
                borderColor: i < stress ? (stress >= MAX_STRESS ? '#ef4444' : '#c9a22a') : 'rgba(51,41,29,0.2)',
                cursor: canEdit ? 'pointer' : 'default',
              }} />
          ))}
        </div>
        {stress >= MAX_STRESS && (
          <p className="text-[10px] text-red-400 mt-2 font-medium">Trauma! — Marque uma condição.</p>
        )}

        {/* Trauma */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(51,41,29,0.05)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-2">Condições de Trauma</p>
          {canEdit ? (
            <input
              type="text"
              defaultValue={traumaField?.value ?? ''}
              onBlur={e => void saveTextField(characterId, 'trauma', 'Trauma', e.target.value).then(onRefresh)}
              placeholder="Nenhum trauma…"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-wax" />
          ) : (
            <p className="text-sm text-ink px-2">{traumaField?.value || <span className="text-ink-soft italic text-xs">—</span>}</p>
          )}
        </div>
      </div>

      {/* Harm */}
      <div className="rounded p-4" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
        <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Dano (Harm)</p>
        <div className="space-y-1.5">
          {[
            { level: 1, keys: ['harm1a', 'harm1b'], label: 'Nível 1 — Menos grave' },
            { level: 2, keys: ['harm2a', 'harm2b'], label: 'Nível 2 — Grave' },
            { level: 3, keys: ['harm3'],            label: 'Nível 3 — Severo' },
            { level: 4, keys: ['harm4'],            label: 'Nível 4 — Fatal' },
          ].map(({ level, keys, label }) => {
            const levelColor = level === 4 ? '#ef4444' : level === 3 ? '#f97316' : level === 2 ? '#f59e0b' : '#6b7280'
            return (
              <div key={level} className="flex items-start gap-2 py-1.5 px-2 rounded"
                style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.04)' }}>
                <span className="font-cinzel text-[10px] font-bold w-5 flex-shrink-0 mt-1" style={{ color: levelColor }}>
                  {level}
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] text-ink-soft/60">{label}</p>
                  {keys.map(k => {
                    const f = textFields.find(tf => tf.key === k)
                    return canEdit ? (
                      <input key={k} type="text" defaultValue={f?.value ?? ''}
                        onBlur={e => void setHarmField(k, e.target.value)}
                        placeholder="Descreva o dano…"
                        className="w-full bg-transparent text-sm focus:outline-none placeholder:text-ink-soft/40"
                        style={{ color: f?.value ? levelColor : undefined }} />
                    ) : (
                      <p key={k} className="text-sm" style={{ color: f?.value ? levelColor : '#4a4a6a' }}>
                        {f?.value || '—'}
                      </p>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Coin + Stash */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Moedas (Coin)</p>
          <CoinTrack
            value={parseInt(textFields.find(f => f.key === 'coin')?.value ?? '0')}
            max={4}
            label="/ 4"
            onSet={async v => {
              await saveTextField(characterId, 'coin', 'Moedas', String(v))
              onRefresh()
            }}
            canEdit={canEdit}
          />
        </div>
        <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Reserva (Stash)</p>
          <CoinTrack
            value={parseInt(textFields.find(f => f.key === 'stash')?.value ?? '0')}
            max={40}
            label="/ 40"
            onSet={async v => {
              await saveTextField(characterId, 'stash', 'Reserva', String(v))
              onRefresh()
            }}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* Armadura + Carga */}
      <div className="grid grid-cols-2 gap-4">
        {/* Armadura */}
        <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Armadura</p>
          <div className="space-y-2">
            <Checkbox checked={armor1} label="Armadura" onChange={() => void toggleArmor(0)} />
            <Checkbox checked={armor2} label="Armadura Pesada" onChange={() => void toggleArmor(1)} />
            <Checkbox checked={armorSpecial} label="Armadura Especial" onChange={() => void toggleArmor(2)} />
          </div>
        </div>

        {/* Carga */}
        <div className="rounded p-3" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
          <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-3">Carga</p>
          <div className="space-y-1.5">
            {['Discreta (1–3)', 'Normal (4–5)', 'Pesada (6)'].map(opt => {
              const key = opt.startsWith('D') ? 'Discreta' : opt.startsWith('N') ? 'Normal' : 'Pesada'
              const isActive = load.startsWith(key)
              return (
                <button key={key} onClick={() => canEdit && void setLoad(key)}
                  disabled={!canEdit}
                  className="w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-all"
                  style={{
                    background: isActive ? 'rgba(201,162,42,0.1)' : 'rgba(51,41,29,0.02)',
                    border: `1px solid ${isActive ? 'rgba(201,162,42,0.4)' : 'rgba(51,41,29,0.05)'}`,
                    color: isActive ? '#c9a22a' : '#5f5040',
                    cursor: canEdit ? 'pointer' : 'default',
                  }}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Personagem tab ─────────────────────────────────────────────────────────────

function PersonagemTab({ textFields, characterId, canEdit, onRefresh }: {
  textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void
}) {
  const FIELDS = [
    { key: 'playbook',       label: 'Playbook',                 multi: false },
    { key: 'heritage',       label: 'Herança',                  multi: false },
    { key: 'background',     label: 'Background',               multi: false },
    { key: 'vice',           label: 'Vício',                    multi: false },
    { key: 'vicePurveyor',   label: 'Fornecedor do Vício',       multi: false },
    { key: 'alias',          label: 'Alias',                    multi: false },
    { key: 'specialAbils',   label: 'Habilidades Especiais',    multi: true  },
    { key: 'contacts',       label: 'Contatos',                 multi: true  },
    { key: 'notes',          label: 'Notas',                    multi: true  },
  ]

  async function save(key: string, label: string, value: string) {
    await saveTextField(characterId, key, label, value)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {FIELDS.map(f => {
        const field = textFields.find(tf => tf.key === f.key)
        return (
          <div key={f.key} className="rounded p-3"
            style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.05)' }}>
            <p className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft mb-2">{f.label}</p>
            {canEdit ? (
              f.multi
                ? <textarea
                    defaultValue={field?.value ?? ''}
                    rows={3}
                    onBlur={e => void save(f.key, f.label, e.target.value)}
                    placeholder={`${f.label}…`}
                    className="w-full bg-parchment/60 border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none resize-none text-ink" />
                : <input type="text"
                    defaultValue={field?.value ?? ''}
                    onBlur={e => void save(f.key, f.label, e.target.value)}
                    placeholder={`${f.label}…`}
                    className="w-full bg-parchment/60 border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none text-ink" />
            ) : (
              <p className="text-sm text-ink px-2 py-1 whitespace-pre-wrap">
                {field?.value || <span className="text-ink-soft italic text-xs">—</span>}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'acoes',      label: 'Ações' },
  { id: 'estado',     label: 'Estado' },
  { id: 'personagem', label: 'Personagem' },
]

export function BitDSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('acoes')

  function refresh() { router.refresh() }

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }}>

      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'rgba(51,41,29,0.14)', background: 'rgba(51,41,29,0.05)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors"
              style={{ color: isActive ? '#c9a22a' : '#5f5040', background: isActive ? 'rgba(201,162,42,0.05)' : 'transparent' }}>
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: 'linear-gradient(90deg, transparent, #c9a22a, transparent)' }} />}
            </button>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === 'acoes'      && <ActionsTab attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'estado'     && <StateTab   attributes={attributes} textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
        {activeTab === 'personagem' && <PersonagemTab textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={refresh} />}
      </div>
    </div>
  )
}
