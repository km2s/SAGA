'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: unknown[]; spellSlots: unknown[]; canEdit: boolean }

const ACCENT = '#3b82f6'
const STAT_NAMES = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
const ICON_TYPES = ['Positivo', 'Conflituoso', 'Negativo']

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}33` }} />
    </div>
  )
}

function mod(value: number) {
  const m = Math.floor((value - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function EditableVal({ attrId, value, characterId, onSaved, className }: { attrId: string; value: number; characterId: string; onSaved: () => void; className?: string }) {
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
      className={`bg-surface-2 border border-blue-600/40 rounded text-center font-bold focus:outline-none ${className ?? 'w-14 text-xl'}`} />
  )
  return (
    <span className={`cursor-pointer hover:text-blue-400 font-mono font-bold text-saga-text transition-colors ${className ?? 'text-xl'}`}
      onClick={() => { setEditing(true); setVal(String(value)) }}>{value}</span>
  )
}

function TFField({ characterId, textFields, tfKey, label, placeholder, multiline = false, canEdit, onRefresh, rows = 3 }: {
  characterId: string; textFields: TextField[]; tfKey: string; label: string; placeholder?: string; multiline?: boolean; canEdit: boolean; onRefresh: () => void; rows?: number
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
  const cls = 'w-full bg-surface-2/50 border border-white/10 rounded-lg text-sm text-saga-muted placeholder-saga-dim/40 focus:outline-none focus:border-blue-500/50 focus:bg-surface-2 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-saga-dim uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={rows} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

function IconRelationship({ num, characterId, textFields, canEdit, onRefresh }: { num: 1 | 2 | 3; characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void }) {
  const typeKey = `icon${num}_type`
  const typeVal = textFields.find(f => f.key === typeKey)?.value ?? 'Positivo'
  const [type, setType] = useState(typeVal)

  async function saveType(newType: string) {
    setType(newType)
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: typeKey, label: `Ícone ${num} — Tipo`, value: newType }),
    }).catch(() => null)
    onRefresh()
  }

  const typeColor = type === 'Positivo' ? '#22c55e' : type === 'Conflituoso' ? '#eab308' : '#ef4444'

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${typeColor}30` }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: typeColor }} />
        <span className="text-[10px] font-bold text-saga-dim uppercase">Ícone {num}</span>
      </div>
      <TFField characterId={characterId} textFields={textFields} tfKey={`icon${num}_name`} label="Nome do Ícone" placeholder="O Arquimago, A Rainha Liche..." canEdit={canEdit} onRefresh={onRefresh} />
      <TFField characterId={characterId} textFields={textFields} tfKey={`icon${num}_dice`} label="Dados de Relacionamento" placeholder="1d6, 2d6, 3d6" canEdit={canEdit} onRefresh={onRefresh} />
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-saga-dim uppercase tracking-wider">Tipo de Relacionamento</label>
        <div className="flex gap-2">
          {ICON_TYPES.map(t => (
            <button key={t} type="button" onClick={() => canEdit && void saveType(t)}
              className="flex-1 py-1 rounded text-[10px] font-bold transition-all"
              style={{ background: type === t ? typeColor : 'rgba(0,0,0,0.3)', color: type === t ? '#000' : 'rgba(255,255,255,0.4)', border: `1px solid ${type === t ? typeColor : 'rgba(255,255,255,0.1)'}` }}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Age13Sheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'combate' | 'icons' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()

  const stats = attributes.filter(a => STAT_NAMES.includes(a.attribute.name))
  const otAttr = attributes.find(a => a.attribute.name === 'One Unique Thing')
  const caAttr = attributes.find(a => a.attribute.name === 'Classe de Armadura')
  const dmAttr = attributes.find(a => a.attribute.name === 'DM')
  const dpAttr = attributes.find(a => a.attribute.name === 'DP')
  const initAttr = attributes.find(a => a.attribute.name === 'Iniciativa')
  const pvAttr = attributes.find(a => a.attribute.name === 'Pontos de Vida')
  const recAttr = attributes.find(a => a.attribute.name === 'Recuperações')

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' }, { id: 'combate', label: 'Combate' },
    { id: 'icons', label: 'Ícones' }, { id: 'personagem', label: 'Personagem' },
  ] as const

  const dexAttr = stats.find(a => a.attribute.name === 'Destreza')
  const initiativeTotal = (initAttr?.value ?? 0) + (dexAttr ? Math.floor((dexAttr.value - 10) / 2) : 0)

  return (
    <div className="space-y-4">
      {/* One Unique Thing — always visible */}
      {otAttr && (
        <div className="rounded-xl px-4 py-3" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>One Unique Thing</div>
          <p className="text-sm text-saga-text italic">{textFields.find(f => f.key === 'one_unique_thing')?.value || 'Não definido'}</p>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <span className="font-cinzel text-sm font-bold" style={{ color: ACCENT }}>13th Age</span>
          <span className="text-[10px] text-saga-dim">Nível {characterLevel}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-saga-dim">
          {caAttr && <span>CA: <span className="font-bold text-saga-text">{caAttr.value}</span></span>}
          {dmAttr && <span>DM: <span className="font-bold text-saga-text">{dmAttr.value}</span></span>}
          {dpAttr && <span>DP: <span className="font-bold text-saga-text">{dpAttr.value}</span></span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: ACCENT, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Atributos" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map(a => (
              <div key={a.id} className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-[10px] font-bold text-saga-dim uppercase mb-1">{a.attribute.name.slice(0, 3).toUpperCase()}</div>
                <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                <div className="mt-1 text-base font-bold" style={{ color: ACCENT }}>{mod(a.value)}</div>
                <div className="text-[9px] text-saga-dim">mod + nível {characterLevel > 0 ? `(${mod(a.value + characterLevel)})` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'combate' && (
        <div className="space-y-4">
          {/* Defenses */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Defesas e Combate" />
            <div className="grid grid-cols-3 gap-3">
              {[caAttr, dmAttr, dpAttr].map(a => a && (
                <div key={a.id} className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-[10px] font-bold text-saga-dim uppercase mb-1">{a.attribute.name}</div>
                  <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {initAttr && (
                <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-[10px] font-bold text-saga-dim uppercase mb-1">Iniciativa</div>
                  <div className="text-xl font-bold" style={{ color: ACCENT }}>{initiativeTotal >= 0 ? `+${initiativeTotal}` : initiativeTotal}</div>
                  <div className="text-[9px] text-saga-dim">DES + nível</div>
                </div>
              )}
              <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-[10px] font-bold text-saga-dim uppercase mb-1">Dado Escalada</div>
                <TFField characterId={characterId} textFields={textFields} tfKey="escalation_die"
                  label="" placeholder="1" canEdit={canEdit} onRefresh={onRefresh} />
              </div>
            </div>
          </div>
          {/* HP & Recoveries */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Vida e Recuperações" />
            <div className="grid grid-cols-2 gap-4">
              {pvAttr && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-saga-dim uppercase">Pontos de Vida</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: ACCENT }}>{pvAttr.value}</div>
                  <TFField characterId={characterId} textFields={textFields} tfKey="hp_current" label="PV Atual" placeholder={String(pvAttr.value)} canEdit={canEdit} onRefresh={onRefresh} />
                </div>
              )}
              {recAttr && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-saga-dim uppercase">Recuperações</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: ACCENT }}>{recAttr.value}</div>
                  <TFField characterId={characterId} textFields={textFields} tfKey="recoveries_used" label="Usadas" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
                </div>
              )}
            </div>
          </div>
          {/* Backgrounds */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Backgrounds" />
            <TFField characterId={characterId} textFields={textFields} tfKey="backgrounds"
              label="Históricos (Nome: Pontos)" placeholder="Ex: Soldado mercenário: 3&#10;Estudioso arcano: 2" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'icons' && (
        <div className="space-y-4">
          <p className="text-[11px] text-saga-dim px-1">Relacionamentos com os 13 Ícones — role no início de cada sessão.</p>
          {([1, 2, 3] as const).map(n => (
            <IconRelationship key={n} num={n} characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Talentos e Poderes" />
            <TFField characterId={characterId} textFields={textFields} tfKey="talents" label="Talentos de Classe" placeholder="Liste seus talentos..." multiline canEdit={canEdit} onRefresh={onRefresh} rows={5} />
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <TFField characterId={characterId} textFields={textFields} tfKey="one_unique_thing" label="One Unique Thing" placeholder="A única coisa que te torna singular no mundo..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="race_notes" label="Raça" placeholder="Humano, Elfo, Anão, Meio-Elfo..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="class_notes" label="Classe" placeholder="Bárbaro, Bardo, Clérigo..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="background" label="Histórico Pessoal" placeholder="Sua história..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
