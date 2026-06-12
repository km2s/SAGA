'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; canEdit: boolean }

const ACCENT = '#1c3a4a'
const TEAL = '#22d3ee'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(34,211,238,0.2)' }} />
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

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = TEAL }: {
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

function AttrRow({ a, characterId, canEdit, onSaved, color }: { a: Attr; characterId: string; canEdit: boolean; onSaved: () => void; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-saga-muted">{a.attribute.name}</span>
      <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onSaved} color={color} />
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
  const cls = 'w-full bg-surface-2/50 border border-white/10 rounded-lg text-sm text-saga-muted placeholder-saga-dim/40 focus:outline-none focus:border-teal-700/50 focus:bg-surface-2 px-3 py-2 transition-colors'
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

function BoxTrack({ label, tfKey, textFields, characterId, canEdit, onRefresh, max = 10, color = TEAL }: {
  label: string; tfKey: string; textFields: TextField[]; characterId: string; canEdit: boolean; onRefresh: () => void; max?: number; color?: string
}) {
  const existing = parseInt(textFields.find(f => f.key === tfKey)?.value ?? '0')
  async function set(v: number) {
    if (!canEdit) return
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: tfKey, label, value: String(v) }),
    }).catch(() => null)
    onRefresh()
  }
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-saga-dim uppercase tracking-wider">{label}</label>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: max }).map((_, i) => (
          <button key={i} type="button" onClick={() => void set(i + 1 === existing ? i : i + 1)}
            className="w-5 h-5 rounded border transition-colors"
            style={{ background: i < existing ? color : 'transparent', borderColor: color }} />
        ))}
      </div>
    </div>
  )
}

export function ChangelingSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'contratos' | 'recursos' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()
  const { physical, social, mental, talents, skills, knowledges, resources } = categorize(attributes)

  const wyrAttr = resources.find(a => a.attribute.name.toLowerCase().includes('wyrd'))
  const glamAttr = resources.find(a => a.attribute.name.toLowerCase().includes('glamour'))

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'recursos', label: 'Recursos' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}60`, border: `1px solid ${TEAL}40` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: TEAL }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: TEAL }}>Changeling: The Lost</span>
        </div>
        <div className="flex items-center gap-4">
          {wyrAttr && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-saga-dim">Wyrd</span>
              <Dots value={wyrAttr.value} max={10} editable={canEdit} attrId={wyrAttr.id} characterId={characterId} onSaved={onRefresh} />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: TEAL, color: '#000' } : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Físico', physical], ['Social', social], ['Mental', mental]].map(([title, list]) => (
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

      {tab === 'contratos' && (
        <div className="space-y-4">
          {resources.filter(a => !['wyrd', 'glamour', 'clarity'].some(k => a.attribute.name.toLowerCase().includes(k))).length > 0 && (
            <div className={card} style={cardStyle}>
              <SectionDivider title="Contratos (atributos)" />
              {resources.filter(a => !['wyrd', 'glamour', 'clarity'].some(k => a.attribute.name.toLowerCase().includes(k))).map(a => (
                <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} color={TEAL} />
              ))}
            </div>
          )}
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="contracts_text" label="Contratos (descrição)" placeholder="Liste seus contratos, dotes e cláusulas..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="pledges_text" label="Juramentos (Pledges)" placeholder="Seus juramentos ativos..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="frailties_text" label="Fraquezas (Frailties)" placeholder="Suas fraquezas feéricas..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'recursos' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Glamour / Wyrd / Claridade" />
            <div className="space-y-4">
              {glamAttr
                ? <div className="flex items-center justify-between"><span className="text-sm text-saga-muted">Glamour</span><Dots value={glamAttr.value} max={10} editable={canEdit} attrId={glamAttr.id} characterId={characterId} onSaved={onRefresh} /></div>
                : <BoxTrack label="Glamour (atual)" tfKey="glamour_current" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
              }
              <BoxTrack label="Willpower (atual)" tfKey="willpower_current" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} color="#a78bfa" />
              <TFField characterId={characterId} textFields={textFields} tfKey="clarity" label="Claridade" placeholder="7" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="seeming" label="Seeming" placeholder="Beast, Darkling, Elemental..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="kith" label="Kith" placeholder="Sua kith..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="court" label="Corte" placeholder="Summer, Winter, Spring, Autumn..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="concept" label="Conceito" canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="notes" label="Notas" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
