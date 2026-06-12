'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Sword, Wand2, User } from 'lucide-react'

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

function groupAttrs(attrs: Attr[]) {
  const base: Attr[] = [], saves: Attr[] = [], combat: Attr[] = [], skills: Attr[] = [], others: Attr[] = []
  for (const a of attrs) {
    const desc = a.attribute.description ?? ''
    const name = a.attribute.name
    if (BASE_ATTR_NAMES.includes(name) || desc.startsWith('Potência')) base.push(a)
    else if (desc.startsWith('Salvaguarda') || name === 'Defesa') saves.push(a)
    else if (desc.startsWith('Combate') || ['BAB', 'CA', 'Classe de Armadura', 'PV', 'Pontos de Vida', 'Pontos de Mana', 'PM', 'Iniciativa'].includes(name)) combat.push(a)
    else if (desc.startsWith('Perícia')) skills.push(a)
    else others.push(a)
  }
  return { base, saves, combat, skills, others }
}

const TABS = [
  { id: 'atributos',  label: 'Atributos',  icon: Shield },
  { id: 'pericias',   label: 'Perícias' },
  { id: 'combate',    label: 'Combate',    icon: Sword },
  { id: 'magia',      label: 'Magia',      icon: Wand2 },
  { id: 'personagem', label: 'Personagem', icon: User },
]

export function Tormenta20Sheet({ characterId, characterLevel, attributes, textFields, weapons, spellSlots, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const grouped = groupAttrs(attributes)
  function refresh() { router.refresh() }
  async function saveTF(key: string, label: string, value: string) {
    await saveTFReq(characterId, key, label, value); refresh()
  }

  const dexAttr = grouped.base.find(a => a.attribute.name === 'Destreza')
  const dexMod = dexAttr ? modNum(dexAttr.value) : 0
  const defesa = 10 + dexMod
  const pmAttr = grouped.combat.find(a => ['PM', 'Pontos de Mana'].includes(a.attribute.name))
  const pmCurrent = getTF(textFields, 'pm_current')

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header bar */}
      <div className="px-5 py-2 border-b flex items-center gap-4" style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)' }}>
        <span className="font-almendra text-[10px] text-red-400 uppercase tracking-widest">Tormenta20</span>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-saga-dim">Defesa</span>
            <span className="font-cinzel font-bold text-sm" style={{ color: ACCENT }}>{defesa}</span>
            <span className="text-[9px] text-saga-dim/50">(10 + DES {signedVal(dexMod)})</span>
          </div>
          {pmAttr && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-saga-dim">PM</span>
              {canEdit
                ? <EditableText value={pmCurrent} onSave={v => void saveTF('pm_current', 'PM Atual', v)} placeholder="0" />
                : <span className="font-cinzel font-bold text-sm text-blue-400">{pmCurrent || 0}</span>}
              <span className="text-[9px] text-saga-dim">/{pmAttr.value}</span>
            </div>
          )}
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
            {grouped.others.length > 0 && (
              <div>
                <SectionDivider title="Outros" />
                {grouped.others.map(attr => (
                  <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded hover:bg-white/[0.015]">
                    <span className="flex-1 text-sm">{attr.attribute.name}</span>
                    {canEdit
                      ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh} className="text-sm w-10 text-center" />
                      : <span className="text-sm text-saga-muted">{attr.value}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Perícias ── */}
        {activeTab === 'pericias' && (
          <div className="space-y-1">
            {grouped.skills.length === 0
              ? <p className="text-sm text-saga-dim text-center py-8">Nenhuma perícia adicionada.</p>
              : grouped.skills.map(attr => {
                  const descMatch = attr.attribute.description?.match(/\(([^)]+)\)/)
                  const attrKey = descMatch?.[1] ?? ''
                  return (
                    <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded hover:bg-white/[0.015]">
                      <span className="flex-1 text-sm">{attr.attribute.name}</span>
                      {attrKey && <span className="text-[9px] text-saga-dim font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>{attrKey}</span>}
                      {canEdit
                        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh}
                            className={`font-cinzel font-bold text-base w-8 text-right ${attr.value >= 0 ? '' : 'text-red-400'}`} />
                        : <span className={`font-cinzel font-bold text-base ${attr.value >= 0 ? '' : 'text-red-400'}`} style={attr.value >= 0 ? { color: ACCENT } : {}}>{signedVal(attr.value)}</span>}
                    </div>
                  )
                })}
          </div>
        )}

        {/* ── Combate ── */}
        {activeTab === 'combate' && (
          <div className="space-y-6">
            {grouped.combat.length > 0 && (
              <div>
                <SectionDivider title="Atributos de Combate" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped.combat.map(attr => (
                    <div key={attr.id} className="flex flex-col items-center gap-1.5 py-4 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {canEdit
                        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh}
                            className="font-cinzel font-bold text-2xl w-16 text-center" />
                        : <span className="font-cinzel font-bold text-2xl" style={{ color: ACCENT }}>{attr.value}</span>}
                      <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-widest">{attr.attribute.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          </div>
        )}

        {/* ── Magia ── */}
        {activeTab === 'magia' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {pmAttr && (
                <div className="rounded p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider mb-2">Pontos de Mana</p>
                  <div className="flex items-center justify-center gap-2">
                    {canEdit
                      ? <EditableText value={pmCurrent} onSave={v => void saveTF('pm_current', 'PM Atual', v)} placeholder="0" />
                      : <span className="font-cinzel font-bold text-2xl text-blue-400">{pmCurrent || 0}</span>}
                    <span className="text-saga-dim">/</span>
                    {canEdit
                      ? <EditableVal attrId={pmAttr.id} value={pmAttr.value} characterId={characterId} onSaved={refresh} className="font-cinzel font-bold text-2xl text-blue-400 w-14 text-center" />
                      : <span className="font-cinzel font-bold text-2xl text-blue-400">{pmAttr.value}</span>}
                  </div>
                </div>
              )}
            </div>
            <SectionDivider title="Espaços de Magia" />
            {spellSlots.filter(s => s.total > 0).length === 0
              ? <p className="text-sm text-saga-dim text-center py-8">Nenhum espaço de magia configurado.</p>
              : (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map(lvl => {
                    const slot = spellSlots.find(s => s.level === lvl)
                    if (!slot || slot.total === 0) return null
                    return (
                      <div key={lvl} className="rounded p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-almendra text-[9px] text-saga-dim uppercase tracking-wider">Círculo {lvl}</span>
                          <span className="font-cinzel text-xs" style={{ color: ACCENT }}>{slot.total - slot.used}/{slot.total}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: slot.total }).map((_, i) => (
                            <div key={i} className="rounded-full border" style={{ width: 12, height: 12, background: i < slot.used ? 'rgba(120,120,160,0.3)' : ACCENT, borderColor: ACCENT }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
        )}

        {/* ── Personagem ── */}
        {activeTab === 'personagem' && (
          <div className="space-y-4">
            {[
              { key: 'origin',     label: 'Origem' },
              { key: 'deity',      label: 'Divindade' },
              { key: 'alignment',  label: 'Tendência' },
              { key: 'xp_current', label: 'XP' },
              { key: 'abilities',  label: 'Poderes e Habilidades', multiline: true },
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
