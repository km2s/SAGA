'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Sword, Wand2, User } from 'lucide-react'

interface Attr {
  id: string
  value: number
  customDie: string | null
  attribute: { name: string; defaultDie: string; description?: string | null }
}
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Weapon { id: string; name: string; attackBonus: string | null; damage: string | null; damageType: string | null; range: string | null; properties: string | null; order: number }
interface SpellSlot { id: string; level: number; total: number; used: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: Weapon[]; spellSlots: SpellSlot[]; canEdit: boolean }

const ACCENT = '#c9a22a'
const BASE_ATTR_NAMES = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']

function mod(value: number) {
  const m = Math.floor((value - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}
function modNum(value: number) { return Math.floor((value - 10) / 2) }
function signedVal(v: number) { return v >= 0 ? `+${v}` : `${v}` }

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
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
      className={`bg-parchment/60 border border-yellow-600/40 rounded text-center font-bold focus:outline-none ${className ?? 'w-12 text-base'}`} />
  }
  return <span className={`cursor-pointer hover:text-yellow-400 transition-colors ${className ?? ''}`}
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
        className="cursor-pointer hover:bg-ink/[0.03] rounded px-2 py-1 min-h-[28px] transition-colors">
        {value ? <span className="text-sm text-ink whitespace-pre-wrap">{value}</span>
          : <span className="text-xs text-ink-soft italic">{placeholder ?? 'Clique para editar…'}</span>}
      </div>
    )
  }
  if (multiline) {
    return <textarea autoFocus rows={4} value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Escape') { setVal(value); setEditing(false) } }} placeholder={placeholder}
      className="w-full bg-parchment/60 border border-yellow-600/40 rounded px-2 py-1 text-sm focus:outline-none resize-none" />
  }
  return <input autoFocus type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
    onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
    placeholder={placeholder} className="w-full bg-parchment/60 border border-yellow-600/40 rounded px-2 py-1 text-sm focus:outline-none" />
}

function saveTextField(characterId: string, key: string, label: string, value: string) {
  return fetch(`/api/characters/${characterId}/text-fields`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, label, value }),
  }).catch(() => null)
}

function getTextField(textFields: TextField[], key: string) {
  return textFields.find(f => f.key === key)?.value ?? ''
}

// ── Attribute grouping ──────────────────────────────────────────────────────

function groupAttrs(attrs: Attr[]) {
  const base: Attr[] = [], saves: Attr[] = [], combat: Attr[] = [], skills: Attr[] = [], others: Attr[] = []
  for (const a of attrs) {
    const desc = a.attribute.description ?? ''
    const name = a.attribute.name
    if (BASE_ATTR_NAMES.includes(name) || desc.startsWith('Potência')) base.push(a)
    else if (desc.startsWith('Salvaguarda')) saves.push(a)
    else if (desc.startsWith('Combate')) combat.push(a)
    else if (desc.startsWith('Perícia')) skills.push(a)
    else others.push(a)
  }
  return { base, saves, combat, skills, others }
}

// ── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'atributos', label: 'Atributos', icon: Shield },
  { id: 'pericias',  label: 'Perícias' },
  { id: 'combate',   label: 'Combate',   icon: Sword },
  { id: 'magia',     label: 'Magia',     icon: Wand2 },
  { id: 'personagem',label: 'Personagem',icon: User },
]

export function DnD35Sheet({ characterId, characterLevel, attributes, textFields, weapons, spellSlots, canEdit }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('atributos')
  const grouped = groupAttrs(attributes)
  function refresh() { router.refresh() }
  async function saveTF(key: string, label: string, value: string) {
    await saveTextField(characterId, key, label, value); refresh()
  }

  const strAttr = grouped.base.find(a => a.attribute.name === 'Força')
  const dexAttr = grouped.base.find(a => a.attribute.name === 'Destreza')
  const strMod = strAttr ? modNum(strAttr.value) : 0
  const dexMod = dexAttr ? modNum(dexAttr.value) : 0
  const babAttr = grouped.combat.find(a => a.attribute.name === 'BAB' || a.attribute.name.toLowerCase().includes('bab'))
  const bab = babAttr?.value ?? 0

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }}>
      {/* Tab bar */}
      <div className="flex flex-wrap border-b" style={{ borderColor: 'rgba(51,41,29,0.14)', background: 'rgba(51,41,29,0.05)' }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3.5 font-almendra text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5"
              style={{ color: isActive ? ACCENT : '#5f5040', background: isActive ? `${ACCENT}0d` : 'transparent' }}>
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
                  const m = mod(attr.value)
                  const pos = !m.startsWith('-')
                  return (
                    <div key={attr.id} className="flex flex-col items-center gap-2 py-5 px-1 rounded-lg border transition-all hover:border-yellow-600/25"
                      style={{ background: 'rgba(51,41,29,0.025)', borderColor: 'rgba(51,41,29,0.14)' }}>
                      <span className={`font-cinzel text-3xl font-bold leading-none ${pos ? 'text-yellow-400' : 'text-red-400'}`}>{m}</span>
                      <div className="w-8 h-px" style={{ background: `${ACCENT}33` }} />
                      {canEdit
                        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh} className="text-sm text-ink-soft w-10 text-center" />
                        : <span className="text-sm text-ink-soft">{attr.value}</span>}
                      <span className="font-almendra text-[9px] text-ink-soft uppercase tracking-widest">
                        {attr.attribute.name.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            {grouped.saves.length > 0 && (
              <div>
                <SectionDivider title="Testes de Resistência" />
                <div className="grid grid-cols-3 gap-2">
                  {grouped.saves.map(attr => (
                    <div key={attr.id} className="flex items-center gap-2 py-3 px-3 rounded"
                      style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
                      <Shield size={10} className="text-ink-soft shrink-0" />
                      <span className="flex-1 text-[11px] text-ink-soft truncate">{attr.attribute.name}</span>
                      {canEdit
                        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh}
                            className={`font-cinzel font-bold text-sm w-8 text-right ${attr.value >= 0 ? 'text-yellow-400' : 'text-red-400'}`} />
                        : <span className={`font-cinzel font-bold text-sm ${attr.value >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{signedVal(attr.value)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {grouped.others.length > 0 && (
              <div>
                <SectionDivider title="Outros" />
                {grouped.others.map(attr => (
                  <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded hover:bg-ink/[0.03]">
                    <span className="flex-1 text-sm">{attr.attribute.name}</span>
                    {canEdit
                      ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh} className="text-sm w-10 text-center" />
                      : <span className="text-sm text-ink-soft">{attr.value}</span>}
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
              ? <p className="text-sm text-ink-soft text-center py-8">Nenhuma perícia adicionada.</p>
              : grouped.skills.map(attr => {
                  const descMatch = attr.attribute.description?.match(/\(([^)]+)\)/)
                  const attrKey = descMatch?.[1] ?? ''
                  return (
                    <div key={attr.id} className="flex items-center gap-3 py-2.5 px-2 rounded hover:bg-ink/[0.03]">
                      <span className="flex-1 text-sm">{attr.attribute.name}</span>
                      {attrKey && <span className="text-[9px] text-ink-soft font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(51,41,29,0.05)' }}>{attrKey}</span>}
                      {canEdit
                        ? <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh}
                            className={`font-cinzel font-bold text-base w-8 text-right ${attr.value >= 0 ? 'text-yellow-400' : 'text-red-400'}`} />
                        : <span className={`font-cinzel font-bold text-base ${attr.value >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{signedVal(attr.value)}</span>}
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* ── Combate ── */}
        {activeTab === 'combate' && (
          <div className="space-y-6">
            <div>
              <SectionDivider title="Bônus Calculados" />
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-4 rounded-lg" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
                  <p className="font-cinzel text-2xl font-bold" style={{ color: ACCENT }}>{signedVal(bab + strMod)}</p>
                  <p className="font-almendra text-[9px] text-ink-soft uppercase tracking-widest mt-1">Ataque Corpo a Corpo</p>
                  <p className="text-[9px] text-ink-soft/50 mt-0.5">BAB {signedVal(bab)} + FOR {signedVal(strMod)}</p>
                </div>
                <div className="text-center py-4 rounded-lg" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
                  <p className="font-cinzel text-2xl font-bold" style={{ color: ACCENT }}>{signedVal(bab + dexMod)}</p>
                  <p className="font-almendra text-[9px] text-ink-soft uppercase tracking-widest mt-1">Ataque à Distância</p>
                  <p className="text-[9px] text-ink-soft/50 mt-0.5">BAB {signedVal(bab)} + DES {signedVal(dexMod)}</p>
                </div>
              </div>
            </div>
            {grouped.combat.length > 0 && (
              <div>
                <SectionDivider title="Atributos de Combate" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped.combat.map(attr => (
                    <div key={attr.id} className="flex flex-col items-center gap-1.5 py-4 rounded-lg"
                      style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
                      {canEdit
                        ? <span className="font-cinzel font-bold text-2xl cursor-pointer" style={{ color: ACCENT }}>
                            <EditableVal attrId={attr.id} value={attr.value} characterId={characterId} onSaved={refresh}
                              className="font-cinzel font-bold text-2xl w-16 text-center" />
                          </span>
                        : <span className="font-cinzel font-bold text-2xl" style={{ color: ACCENT }}>{attr.value}</span>}
                      <span className="font-almendra text-[9px] text-ink-soft uppercase tracking-widest">{attr.attribute.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Weapons */}
            <SectionDivider title="Ataques & Armas" />
            {weapons.length === 0
              ? <p className="text-xs text-ink-soft text-center py-3 italic">Nenhuma arma.</p>
              : (
                <div className="space-y-1">
                  {weapons.map(w => (
                    <div key={w.id} className="grid grid-cols-[1fr_80px_100px_80px] gap-2 py-2 px-2 rounded hover:bg-ink/[0.03]">
                      <span className="text-sm font-medium">{w.name}</span>
                      <span className="text-sm text-center font-cinzel" style={{ color: ACCENT }}>{w.attackBonus ?? '—'}</span>
                      <span className="text-sm text-center font-mono">{w.damage ?? '—'}</span>
                      <span className="text-xs text-ink-soft">{w.range ?? '—'}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* ── Magia ── */}
        {activeTab === 'magia' && (
          <div className="space-y-4">
            <SectionDivider title="Espaços de Magia" />
            {spellSlots.filter(s => s.total > 0).length === 0
              ? <p className="text-sm text-ink-soft text-center py-8">Nenhum espaço de magia configurado.</p>
              : (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(lvl => {
                    const slot = spellSlots.find(s => s.level === lvl)
                    if (!slot || slot.total === 0) return null
                    return (
                      <div key={lvl} className="rounded p-2.5" style={{ background: 'rgba(51,41,29,0.025)', border: '1px solid rgba(51,41,29,0.14)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-almendra text-[9px] text-ink-soft uppercase tracking-wider">Nível {lvl}</span>
                          <span className="font-cinzel text-xs" style={{ color: ACCENT }}>{slot.total - slot.used}/{slot.total}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: slot.total }).map((_, i) => (
                            <div key={i} className="rounded-full border"
                              style={{ width: 12, height: 12, background: i < slot.used ? 'rgba(120,120,160,0.3)' : ACCENT, borderColor: i < slot.used ? 'rgba(120,120,160,0.5)' : ACCENT }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            <div className="mt-4">
              <SectionDivider title="Talentos" />
              <EditableText value={getTextField(textFields, 'feats')} onSave={v => void saveTF('feats', 'Talentos', v)} placeholder="Liste seus talentos…" multiline />
            </div>
          </div>
        )}

        {/* ── Personagem ── */}
        {activeTab === 'personagem' && (
          <div className="space-y-4">
            {[
              { key: 'race_notes',        label: 'Raça' },
              { key: 'class_notes',       label: 'Classe' },
              { key: 'alignment',         label: 'Alinhamento' },
              { key: 'deity',             label: 'Deidade' },
              { key: 'feats',             label: 'Talentos', multiline: true },
              { key: 'special_abilities', label: 'Habilidades Especiais', multiline: true },
            ].map(f => (
              <div key={f.key} className="rounded p-3" style={{ background: 'rgba(51,41,29,0.02)', border: '1px solid rgba(51,41,29,0.05)' }}>
                <label className="font-almendra text-[9px] uppercase tracking-widest text-ink-soft block mb-2">{f.label}</label>
                {canEdit
                  ? <EditableText value={getTextField(textFields, f.key)} onSave={v => void saveTF(f.key, f.label, v)}
                      placeholder={`${f.label}…`} multiline={f.multiline} />
                  : <p className="text-sm text-ink px-2 py-1 whitespace-pre-wrap">{getTextField(textFields, f.key) || <span className="text-ink-soft italic text-xs">—</span>}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
