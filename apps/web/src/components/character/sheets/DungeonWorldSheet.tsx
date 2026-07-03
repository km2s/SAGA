'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: unknown[]; spellSlots: unknown[]; canEdit: boolean }

const ACCENT = '#16a34a'
const STAT_NAMES = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}33` }} />
    </div>
  )
}

function statMod(value: number) {
  const m = value >= 18 ? 3 : value >= 16 ? 2 : value >= 13 ? 1 : value >= 9 ? 0 : value >= 6 ? -1 : -2
  return m >= 0 ? `+${m}` : `${m}`
}

function EditableVal({ attrId, value, characterId, onSaved }: { attrId: string; value: number; characterId: string; onSaved: () => void }) {
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
  if (editing) return (
    <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
      className="w-14 bg-parchment/60 border border-green-600/40 rounded text-center font-bold focus:outline-none text-xl" />
  )
  return (
    <span className="cursor-pointer hover:text-green-400 font-mono font-bold text-ink transition-colors text-xl"
      onClick={() => { setEditing(true); setVal(String(value)) }}>{value}</span>
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-green-500/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={4} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

export function DungeonWorldSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'stats' | 'moves' | 'estado' | 'personagem'>('stats')
  const onRefresh = () => router.refresh()

  const stats = attributes.filter(a => STAT_NAMES.includes(a.attribute.name))
  const hpAttr = attributes.find(a => a.attribute.name === 'Pontos de Vida')
  const dmgAttr = attributes.find(a => a.attribute.name === 'Dano')
  const armorAttr = attributes.find(a => a.attribute.name === 'Armadura')
  const xpAttr = attributes.find(a => a.attribute.name === 'XP')

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }
  const tabs = [
    { id: 'stats', label: 'Stats' }, { id: 'moves', label: 'Moves' },
    { id: 'estado', label: 'Estado' }, { id: 'personagem', label: 'Personagem' },
  ] as const

  const xpVal = xpAttr?.value ?? 0
  const xpMax = characterLevel + 7

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: ACCENT }}>Dungeon World</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-soft">
          {hpAttr && <span>PV: <span className="font-bold text-ink">{hpAttr.value}</span></span>}
          {dmgAttr && <span>Dano: <span className="font-bold" style={{ color: ACCENT }}>d{dmgAttr.value}</span></span>}
          {armorAttr && <span>Armadura: <span className="font-bold text-ink">{armorAttr.value}</span></span>}
        </div>
      </div>

      {/* XP Bar */}
      <div className={card} style={cardStyle}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">Experiência</span>
          <span className="text-[10px] text-ink-soft">{xpVal} / {xpMax} {xpVal >= xpMax && <span style={{ color: ACCENT }}>✓ Suba de Nível!</span>}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: xpMax }).map((_, i) => (
            <div key={i} className="flex-1 h-2 rounded-full" style={{ background: i < xpVal ? ACCENT : 'rgba(51,41,29,0.1)' }} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(51,41,29,0.08)', border: '1px solid rgba(51,41,29,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: ACCENT, color: '#fff' } : { color: 'rgba(51,41,29,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Estatísticas (2d6 + Mod)" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map(a => (
              <div key={a.id} className="text-center p-3 rounded-lg" style={{ background: 'rgba(51,41,29,0.08)' }}>
                <div className="text-[10px] font-bold text-ink-soft uppercase mb-1">{a.attribute.name.slice(0, 3).toUpperCase()}</div>
                <div className="text-[10px] text-ink-soft mb-1">{a.attribute.name}</div>
                <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                <div className="mt-1 text-lg font-bold" style={{ color: ACCENT }}>{statMod(a.value)}</div>
                <div className="text-[9px] text-ink-soft">modificador</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'moves' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Moves Básicos de Classe" />
            <TFField characterId={characterId} textFields={textFields} tfKey="class_moves"
              label="Moves da Classe" placeholder="Liste os moves da sua classe..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Vínculos (Bonds)" />
            <TFField characterId={characterId} textFields={textFields} tfKey="bonds_list"
              label="Vínculos com outros personagens" placeholder="Ex: _____ me deve uma favor importante..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'estado' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Estado Atual" />
          <div className="space-y-3">
            {hpAttr && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  <span>Pontos de Vida</span>
                  <span>{hpAttr.value} PV máximos</span>
                </div>
                <TFField characterId={characterId} textFields={textFields} tfKey="hp_current" label="PV Atual" placeholder={String(hpAttr.value)} canEdit={canEdit} onRefresh={onRefresh} />
              </div>
            )}
            <TFField characterId={characterId} textFields={textFields} tfKey="armor_value" label="Armadura Total" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="conditions" label="Condições / Deformidades" placeholder="Debilitado, Confuso..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <TFField characterId={characterId} textFields={textFields} tfKey="alignment" label="Alinhamento" placeholder="Caótico, Bom, Neutro, Mau, Legal" canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="race_notes" label="Raça / Traço de Raça" placeholder="Humano — You are a Risk-Taker..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="background" label="Histórico" placeholder="De onde você vem..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
