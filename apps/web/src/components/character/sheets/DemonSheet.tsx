'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons: unknown[]; canEdit: boolean }

const ACCENT = '#dc2626'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(201,162,42,0.2)' }} />
    </div>
  )
}

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const resources: Attr[] = []
  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    if      (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else                                   resources.push(a)
  }
  return { physical, social, mental, talents, skills, knowledges, resources }
}

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = ACCENT }: {
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
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-saga-muted">{a.attribute.name}</span>
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
  const cls = 'w-full bg-surface-2/50 border border-white/10 rounded-lg text-sm text-saga-muted placeholder-saga-dim/40 focus:outline-none focus:border-red-500/50 focus:bg-surface-2 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-saga-dim uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

function HealthTrack({ characterId, textFields, canEdit, onRefresh }: { characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void }) {
  const existing = textFields.find(f => f.key === 'healthTrack')?.value ?? '0000000'
  const [track, setTrack] = useState(existing.split('').map(Number))
  const LEVELS = ['Ileso', 'Ferido (−1)', 'Ferido (−1)', 'Ferido (−2)', 'Ferido (−2)', 'Aleijado (−5)', 'Incapacitado']
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
      <SectionDivider title="Saúde" />
      <div className="space-y-1">
        {LEVELS.map((lbl, i) => (
          <div key={i} className="flex items-center gap-3">
            <button type="button" onClick={() => void toggle(i)} disabled={!canEdit}
              className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${track[i] ? 'bg-red-600' : 'bg-transparent'}`}
              style={{ borderColor: ACCENT }} />
            <span className="text-[11px] text-saga-dim">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DemonSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'poderes' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()
  const { physical, social, mental, talents, skills, knowledges, resources } = categorize(attributes)

  const card = 'rounded-xl p-4 space-y-1' as const
  const cardStyle = { background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
  const tabs = ['atributos', 'habilidades', 'poderes', 'personagem'] as const

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
        <span className="font-cinzel text-sm font-bold" style={{ color: ACCENT }}>Demon: The Descent</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all capitalize"
            style={tab === t ? { background: ACCENT, color: '#000' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t === 'atributos' ? 'Atributos' : t === 'habilidades' ? 'Habilidades' : t === 'poderes' ? 'Poderes' : 'Personagem'}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Físico', physical], ['Social', social], ['Mental', mental]] .map(([title, list]) => (
            <div key={String(title)} className={card} style={cardStyle}>
              <SectionDivider title={String(title)} />
              {(list as Attr[]).map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)}
            </div>
          ))}
        </div>
      )}

      {tab === 'habilidades' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Talentos', talents], ['Perícias', skills], ['Conhecimentos', knowledges]].map(([title, list]) => (
            <div key={String(title)} className={card} style={cardStyle}>
              <SectionDivider title={String(title)} />
              {(list as Attr[]).map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)}
            </div>
          ))}
        </div>
      )}

      {tab === 'poderes' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Recursos" />
            {resources.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)}
          </div>
          <HealthTrack characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
          <div className={card} style={cardStyle}>
            <SectionDivider title="Embeds e Exploits" />
            <div className="space-y-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="embeds_list" label="Embeds" placeholder="Liste seus embeds..." multiline canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="exploits_list" label="Exploits" placeholder="Liste seus exploits..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <TFField characterId={characterId} textFields={textFields} tfKey="agenda" label="Agenda" placeholder="Saboteur, Integrator, Inquisitor..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="cover_identity" label="Identidade de Cobertura" placeholder="Quem você aparenta ser..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="demon_form" label="Forma Demoníaca" placeholder="Descrição da forma demoníaca..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="xp_current" label="XP Atual" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="xp_total" label="XP Total Gasto" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
