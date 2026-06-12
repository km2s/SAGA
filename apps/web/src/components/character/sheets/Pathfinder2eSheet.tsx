'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Sword, User } from 'lucide-react'

interface Attr {
  id: string; value: number; customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Weapon { id: string; name: string; attackBonus: string | null; damage: string | null; damageType: string | null; range: string | null; properties: string | null; order: number }
interface SpellSlot { id: string; level: number; total: number; used: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: Weapon[]; spellSlots: SpellSlot[]; canEdit: boolean }

const ACCENT = '#dc2626'
const BASE_ATTR_NAMES = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
const PROF_DEGREES = ['Sem Treinamento', 'Treinado', 'Experiente', 'Mestre', 'Lendário']
const PROF_BONUS   = [0, 2, 4, 6, 8]

function modNum(v: number) { return Math.floor((v - 10) / 2) }
function modStr(v: number) { const m = modNum(v); return m >= 0 ? `+${m}` : `${m}` }
function signedVal(v: number) { return v >= 0 ? `+${v}` : `${v}` }

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}33` }} />
    </div>
  )
}

function EditableVal({ attrId, value, characterId, onSaved, className }: {
  attrId: string; value: number; characterId: string; onSaved: () => void; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  async function save() {
    const n = parseInt(val)
    if (isNaN(n) || n === value) { setEditing(false); return }
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: n }),
    }).catch(() => null)
    setEditing(false); onSaved()
  }
  if (editing) {
    return <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
      className={`bg-surface-2 border border-red-600/40 rounded text-center font-bold focus:outline-none ${className ?? 'w-12 text-base'}`} />
  }
  return <span className={`cursor-pointer hover:text-red-400 transition-colors ${className ?? ''}`}
    onClick={() => { setEditing(true); setVal(String(value)) }}>{value}</span>
}

function EditableText({ value, onSave, placeholder, multiline = false }: {
  value: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  function commit() { onSave(val); setEditing(false) }
  if (!editing) {
    return (
      <div onClick={() => { setEditing(true); setVal(value) }}
        className="cursor-pointer hover:bg-white/[0.03] rounded px-2 py-1 min-h-[28px]">
        {value ? <span className="text-sm text-saga-text whitespace-pre-wrap">{value}</span>
          : <span className="text-xs text-saga-dim italic">{placeholder ?? 'Clique para editar…'}</span>}
      </div>
    )
  }
  if (multiline) {
    return <textarea autoFocus rows={4} value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Escape') { setVal(value); setEditing(false) } }} placeholder={placeholder}
      className="w-full bg-surface-2 border border-red-600/40 rounded px-2 py-1 text-sm focus:outline-none resize-none" />
  }
  return <input autoFocus type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
    onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
    placeholder={placeholder} className="w-full bg-surface-2 border border-red-600/40 rounded px-2 py-1 text-sm focus:outline-none" />
}

function saveTFReq(characterId: string, key: string, label: string, value: string) {
  return fetch(`/api/characters/${characterId}/text-fields`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, label, value }),
  }).catch(() => null)
}
function getTF(textFields: TextField[], key: string) { return textFields.find(f => f.key === key)?.value ?? '' }

function groupAttrs(attrs: Attr[], level: number) {
  const base: Attr[] = [], saves: Attr[] = [], skills: Attr[] = [], others: Attr[] = []
  for (const a of attrs) {
    const desc = a.attribute.description ?? ''
    const name = a.attribute.name
    if (BASE_ATTR_NAMES.includes(name) || desc.startsWith('Potência')) base.push(a)
    else if (desc.startsWith('Salvaguarda') || ['Fortitude', 'Reflexo', 'Vontade'].includes(name)) saves.push(a)
    else if (desc.startsWith('Perícia')) skills.push(a)
    else others.push(a)
  }
  return { base, saves, skills, others }
}

function ProfBadge({ degree }: { degree: number }) {
  const label = PROF_DEGREES[degree] ?? 'Sem Treinamento'
  const colors = ['#6b7280', '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']
  const color = colors[degree] ?? '#6b7280'
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}

const TABS = [
  { id: 'atributos',  label: 'Atributos',  icon: Shield },
  { id: 'pericias',   label: 'Perícias' },
  { id: 'combate',    label: 'Combate',    icon: Sword },
  { id: 'personagem', label: 'Personagem', icon: User },
]

// Three-action reminder
const THREE_ACTIONS = [
  { symbol: '◆', label: 'Uma Ação', desc: 'Atacar, mover, preparar, interagir' },
  { symbol: '◆◆', label: 'Duas Ações', desc: 'Lançar magia, corrida, manobra' },
  { symbol: '◆◆◆', label: 'Três Ações', desc: 'Ações especiais de classe' },
  { symbol: '◇', label: 'Ação Livre', desc: 'Não conta contra o limite' },
  { symbol: '↺', label: 'Reação', desc: '1 por rodada, trigger específico' },
]

export function Pathfinder2eSheet({ characterId, characterLevel, attributes, textFields, weapons, spellSlots, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const grouped = groupAttrs(attributes, characterLevel)
  function refresh() { router.refresh() }
  async function saveTF(key: string, label: string, value: string) {
    await saveTFReq(characterId, key, label, value); refresh()
  }

  // dying / wounded / hero points
  const dying   = parseInt(getTF(textFields, 'dying'))   || 0
  const wounded = parseInt(getTF(textFields, 'wounded')) || 0
  const heroPoints = parseInt(getTF(textFields, 'hero_points')) || 0

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Quick bar */}
      <div className="flex items-center gap-4 px-5 py-2 border-b" style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider">Morrendo</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <button key={i} disabled={!canEdit} onClick={async () => { await saveTF('dying', 'Morrendo', String(i === dying ? 0 : i + 1)); }}
                className="rounded-sm border transition-all"
                style={{ width: 14, height: 14, background: i < dying ? ACCENT : 'transparent', borderColor: i < dying ? ACCENT : 'rgba(255,255,255,0.2)', cursor: canEdit ? 'pointer' : 'default' }} />
            ))}
          </div>
          <span className="text-[9px] text-saga-dim">/{4}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider">Ferido</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <button key={i} disabled={!canEdit} onClick={async () => { await saveTF('wounded', 'Ferido', String(i === wounded - 1 ? 0 : i + 1)); }}
                className="rounded-sm border transition-all"
                style={{ width: 14, height: 14, background: i < wounded ? '#f97316' : 'transparent', borderColor: i < wounded ? '#f97316' : 'rgba(255,255,255,0.2)', cursor: canEdit ? 'pointer' : 'default' }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider">Pontos de Herói</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <button key={i} disabled={!canEdit} onClick={async () => { await saveTF('hero_points', 'Pontos de Herói', String(i === heroPoints ? 0 : i)); }}
                className="rounded-full border transition-all"
                style={{ width: 14, height: 14, background: i <= heroPoints ? '#f59e0b' : 'transparent', borderColor: i <= heroPoints ? '#f59e0b' : 'rgba(255,255,255,0.2)', cursor: canEdit ? 'pointer' : 'default' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5"
              style={{ color: isActive ? ACCENT : '#7878a0', background: isActive ? `${ACCENT}0d` : 'transparent' }}>
              {Icon && <Icon size={11} />}{tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />}
            </button>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">
        {/* ── Atributos ── */}
        {activeTab === 'atributos' && (
          <div className="space-y-7">
            <div>
              <SectionDivider title="Atributos Base" />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {grouped.base.map(attr => {
                  const m = modStr(attr.value)
                  const pos = !m.startsWith('-')
                  return (
                    <div key={attr.id} className="flex flex-col items-center gap-2 py-5 px-1 rounded-lg border transition-all"
                      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <span className="font-cinzel text-3xl font-bold leading-none" style={{ color: pos ? ACCENT : '#ef4444' }}>{m}</span>
                      <div className="w-8 h-px" style={{ background: `${ACCENT}33` }} />
                      {canEdit
                        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh} className="text-sm text-saga-muted w-10 text-center" />
                        : <span className="text-sm text-saga-muted">{attr.value}</span>}
                      <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest">{attr.attribute.name.slice(0, 3).toUpperCase()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {grouped.saves.length > 0 && (
              <div>
                <SectionDivider title="Salvaguardas" />
                <div className="space-y-1.5">
                  {grouped.saves.map(attr => {
                    const totalBonus = attr.value + characterLevel
                    return (
                      <div key={attr.id} className="flex items-center gap-3 py-2.5 px-3 rounded"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Shield size={10} className="text-saga-dim shrink-0" />
                        <span className="flex-1 text-sm">{attr.attribute.name}</span>
                        <ProfBadge degree={Math.min(4, Math.floor(attr.value / 2))} />
                        {canEdit
                          ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh}
                              className="font-cinzel font-bold text-sm w-8 text-right" />
                          : <span className="font-cinzel font-bold text-sm" style={{ color: ACCENT }}>{signedVal(totalBonus)}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Perícias ── */}
        {activeTab === 'pericias' && (
          <div className="space-y-6">
            <div className="text-[11px] text-saga-dim leading-relaxed rounded p-3" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <p className="font-medium text-red-400 mb-1">Graus de Proficiência PF2e</p>
              {PROF_DEGREES.map((d, i) => (
                <p key={d}><span className="font-mono">+{PROF_BONUS[i]}</span> → {d} (+ nível do personagem se treinado)</p>
              ))}
            </div>
            {grouped.skills.length === 0
              ? <p className="text-sm text-saga-dim text-center py-8">Nenhuma perícia adicionada.</p>
              : grouped.skills.map(attr => {
                  const descMatch = attr.attribute.description?.match(/\(([^)]+)\)/)
                  const attrKey = descMatch?.[1] ?? ''
                  const profDegree = Math.min(4, Math.max(0, attr.value))
                  const totalBonus = PROF_BONUS[profDegree]! + (profDegree > 0 ? characterLevel : 0) + (
                    (() => {
                      const matchedAttr = grouped.base.find(a => a.attribute.name.slice(0,3).toUpperCase() === attrKey)
                      return matchedAttr ? modNum(matchedAttr.value) : 0
                    })()
                  )
                  return (
                    <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded hover:bg-white/[0.015]">
                      <span className="flex-1 text-sm">{attr.attribute.name}</span>
                      {attrKey && <span className="text-[9px] text-saga-dim font-mono">{attrKey}</span>}
                      <ProfBadge degree={profDegree} />
                      <span className="font-cinzel font-bold text-base w-10 text-right" style={{ color: ACCENT }}>{signedVal(totalBonus)}</span>
                    </div>
                  )
                })}
          </div>
        )}

        {/* ── Combate ── */}
        {activeTab === 'combate' && (
          <div className="space-y-6">
            <div>
              <SectionDivider title="Sistema de 3 Ações" />
              <div className="grid grid-cols-1 gap-1.5">
                {THREE_ACTIONS.map(a => (
                  <div key={a.label} className="flex items-center gap-3 py-2 px-3 rounded"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="font-cinzel font-bold text-sm w-12 shrink-0" style={{ color: ACCENT }}>{a.symbol}</span>
                    <span className="text-sm font-medium w-28">{a.label}</span>
                    <span className="text-[11px] text-saga-dim">{a.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <SectionDivider title="Ataques & Armas" />
            {weapons.length === 0
              ? <p className="text-xs text-saga-dim text-center py-3 italic">Nenhuma arma.</p>
              : weapons.map(w => (
                  <div key={w.id} className="grid grid-cols-[1fr_80px_100px_80px] gap-2 py-2 px-2 rounded hover:bg-white/[0.015]">
                    <span className="text-sm font-medium">{w.name}</span>
                    <span className="text-sm text-center font-cinzel" style={{ color: ACCENT }}>{w.attackBonus ?? '—'}</span>
                    <span className="text-sm text-center font-mono">{w.damage ?? '—'}</span>
                    <span className="text-xs text-saga-muted">{w.range ?? '—'}</span>
                  </div>
                ))}
            {spellSlots.some(s => s.total > 0) && (
              <div>
                <SectionDivider title="Espaços de Magia" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 10 }, (_, i) => i).map(lvl => {
                    const slot = spellSlots.find(s => s.level === lvl)
                    if (!slot || slot.total === 0) return null
                    return (
                      <div key={lvl} className="rounded p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-almendra text-[9px] text-saga-dim uppercase">{lvl === 0 ? 'Truques' : `Nível ${lvl}`}</span>
                          <span className="font-cinzel text-xs" style={{ color: ACCENT }}>{slot.total - slot.used}/{slot.total}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: slot.total }).map((_, i) => (
                            <div key={i} className="rounded-full border" style={{ width: 10, height: 10, background: i < slot.used ? 'rgba(120,120,160,0.3)' : ACCENT, borderColor: ACCENT }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Personagem ── */}
        {activeTab === 'personagem' && (
          <div className="space-y-4">
            {[
              { key: 'ancestry',       label: 'Ancestralidade' },
              { key: 'background',     label: 'Background' },
              { key: 'languages',      label: 'Línguas' },
              { key: 'coins',          label: 'Moedas' },
              { key: 'xp_current',     label: 'XP' },
              { key: 'ancestry_feats', label: 'Talentos de Ancestralidade', multiline: true },
              { key: 'class_feats',    label: 'Talentos de Classe',         multiline: true },
              { key: 'general_feats',  label: 'Talentos Gerais',            multiline: true },
            ].map(f => (
              <div key={f.key} className="rounded p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label className="font-almendra text-[9px] uppercase tracking-widest text-saga-dim block mb-2">{f.label}</label>
                {canEdit
                  ? <EditableText value={getTF(textFields, f.key)} onSave={v => void saveTF(f.key, f.label, v)} placeholder={`${f.label}…`} multiline={(f as {multiline?: boolean}).multiline} />
                  : <p className="text-sm text-saga-text px-2 py-1 whitespace-pre-wrap">{getTF(textFields, f.key) || <span className="text-saga-dim italic text-xs">—</span>}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
