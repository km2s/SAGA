'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons: unknown[]; spellSlots: unknown[]; canEdit: boolean }

const ACCENT = '#dc2626'
const PRIMARY = ['Força', 'Destreza', 'Inteligência', 'Saúde']
const SECONDARY = ['Pontos de Vida', 'Vontade', 'Percepção', 'Fadiga']
const DEFENSES = ['Esquiva', 'Aparar', 'Bloqueio']

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${ACCENT}33` }} />
    </div>
  )
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
      className="w-14 bg-parchment/60 border border-red-600/40 rounded text-center font-bold focus:outline-none text-sm" />
  )
  return (
    <span className="cursor-pointer hover:text-red-400 font-mono font-bold text-ink transition-colors text-sm"
      onClick={() => { setEditing(true); setVal(String(value)) }}>{value}</span>
  )
}

function TFField({ characterId, textFields, tfKey, label, placeholder, multiline = false, type = 'text', canEdit, onRefresh }: {
  characterId: string; textFields: TextField[]; tfKey: string; label: string; placeholder?: string; multiline?: boolean; type?: string; canEdit: boolean; onRefresh: () => void
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-red-500/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={4} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

export function GURPSSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'pericias' | 'vantagens' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()

  const primary = attributes.filter(a => PRIMARY.includes(a.attribute.name))
  const secondary = attributes.filter(a => SECONDARY.includes(a.attribute.name))
  const defenses = attributes.filter(a => DEFENSES.includes(a.attribute.name))
  const other = attributes.filter(a => !PRIMARY.includes(a.attribute.name) && !SECONDARY.includes(a.attribute.name) && !DEFENSES.includes(a.attribute.name))

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' }, { id: 'pericias', label: 'Perícias' },
    { id: 'vantagens', label: 'Vantagens' }, { id: 'personagem', label: 'Personagem' },
  ] as const

  const pointsTotal = parseInt(textFields.find(f => f.key === 'points_total')?.value ?? '100')
  const pointsSpent = parseInt(textFields.find(f => f.key === 'points_spent')?.value ?? '0')

  return (
    <div className="space-y-4">
      {/* Header + Points */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: ACCENT }}>GURPS 4e</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-ink-soft">Pontos: <span className="font-bold text-ink">{pointsSpent}</span> / <span className="font-bold" style={{ color: ACCENT }}>{pointsTotal}</span></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgb(var(--ink) / 0.08)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: ACCENT, color: '#fff' } : { color: 'rgb(var(--ink) / 0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className="space-y-4">
          {/* Primary Attributes */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Atributos Primários" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {primary.map(a => (
                <div key={a.id} className="text-center space-y-1 p-3 rounded-lg" style={{ background: 'rgb(var(--ink) / 0.08)' }}>
                  <div className="text-[10px] font-bold text-ink-soft uppercase">{a.attribute.name}</div>
                  <div className="text-2xl font-bold" style={{ color: ACCENT }}>
                    <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                  </div>
                  <div className="text-[10px] text-ink-soft">{a.attribute.name === 'Força' ? 'FOR' : a.attribute.name === 'Destreza' ? 'DX' : a.attribute.name === 'Inteligência' ? 'IQ' : 'HT'}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Secondary Attributes */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Atributos Secundários" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {secondary.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0 col-span-2">
                  <span className="text-sm text-ink-soft">{a.attribute.name}</span>
                  <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                </div>
              ))}
            </div>
          </div>
          {/* Defenses */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Defesas Ativas" />
            <div className="grid grid-cols-3 gap-4">
              {defenses.map(a => (
                <div key={a.id} className="text-center p-2 rounded-lg" style={{ background: 'rgb(var(--ink) / 0.08)' }}>
                  <div className="text-[10px] font-bold text-ink-soft uppercase mb-1">{a.attribute.name}</div>
                  <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                </div>
              ))}
            </div>
          </div>
          {/* Other derived */}
          {other.length > 0 && (
            <div className={card} style={cardStyle}>
              <SectionDivider title="Outros" />
              {other.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
                  <span className="text-sm text-ink-soft">{a.attribute.name}</span>
                  <EditableVal attrId={a.id} value={a.value} characterId={characterId} onSaved={onRefresh} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'pericias' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Perícias" />
          <p className="text-[11px] text-ink-soft mb-3">Anote cada perícia com nível relativo, nível efetivo e pontos gastos.</p>
          <TFField characterId={characterId} textFields={textFields} tfKey="skills_list"
            label="Lista de Perícias (Nome | Atributo | Nível Relativo | Nível | Pontos)"
            placeholder="Ex: Espadas (DX+1) — Nível 12 — 4 pts&#10;Arco (DX) — Nível 11 — 1 pt"
            multiline canEdit={canEdit} onRefresh={onRefresh} />
        </div>
      )}

      {tab === 'vantagens' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Vantagens" />
            <TFField characterId={characterId} textFields={textFields} tfKey="advantages"
              label="Vantagens e Habilidades" placeholder="Liste suas vantagens..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Desvantagens" />
            <TFField characterId={characterId} textFields={textFields} tfKey="disadvantages"
              label="Desvantagens e Quirks" placeholder="Liste suas desvantagens..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="points_total" label="Pontos Totais" placeholder="100" type="number" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="points_spent" label="Pontos Gastos" placeholder="0" type="number" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="background" label="Histórico" placeholder="Background do personagem..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
