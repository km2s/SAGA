'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; canEdit: boolean }

const ACCENT = '#1e3a5f'
const BLUE = '#60a5fa'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(96,165,250,0.2)' }} />
    </div>
  )
}

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const arcana: Attr[] = []; const resources: Attr[] = []
  const ARCANA_NAMES = ['Morte', 'Destino', 'Forças', 'Matéria', 'Mente', 'Primo', 'Espaço', 'Espírito', 'Tempo', 'Vida',
    'Death', 'Fate', 'Forces', 'Matter', 'Mind', 'Prime', 'Space', 'Spirit', 'Time', 'Life']
  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    const name = a.attribute.name
    if      (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else if (ARCANA_NAMES.some(s => name.includes(s))) arcana.push(a)
    else                                   resources.push(a)
  }
  return { physical, social, mental, talents, skills, knowledges, arcana, resources }
}

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = BLUE }: {
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
    <div className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
      <span className="text-sm text-ink-soft">{a.attribute.name}</span>
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-blue-700/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
      {multiline
        ? <textarea rows={3} value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
        : <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={e => void save(e.target.value)}
            disabled={!canEdit || saving} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

export function MageAwkSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'arcanos' | 'recursos' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()
  const { physical, social, mental, talents, skills, knowledges, arcana, resources } = categorize(attributes)

  const gnoseAttr = resources.find(a => a.attribute.name.toLowerCase().includes('gnose') || a.attribute.name.toLowerCase().includes('gnosis'))

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'arcanos', label: 'Arcanos' },
    { id: 'recursos', label: 'Recursos' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}60`, border: `1px solid ${BLUE}40` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: BLUE }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: BLUE }}>Mage: The Awakening</span>
        </div>
        {gnoseAttr && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-soft">Gnose</span>
            <Dots value={gnoseAttr.value} max={10} editable={canEdit} attrId={gnoseAttr.id} characterId={characterId} onSaved={onRefresh} />
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(51,41,29,0.08)', border: '1px solid rgba(51,41,29,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: BLUE, color: '#000' } : { color: 'rgba(51,41,29,0.4)' }}>
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

      {tab === 'arcanos' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="10 Arcanos" />
          {arcana.length > 0
            ? arcana.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} color={BLUE} />)
            : (
              <TFField characterId={characterId} textFields={textFields} tfKey="arcana_text"
                label="Arcanos (Morte, Destino, Forças, Matéria, Mente, Primo, Espaço, Espírito, Tempo, Vida)"
                placeholder="Liste seus arcanos e níveis..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            )
          }
        </div>
      )}

      {tab === 'recursos' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Recursos" />
            {resources.filter(a => !a.attribute.name.toLowerCase().includes('gnose')).map(a => (
              <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} color={BLUE} />
            ))}
          </div>
          <div className={card} style={cardStyle}>
            <div className="grid grid-cols-3 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="mana_current" label="Mana (atual)" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="wisdom" label="Sabedoria" placeholder="7" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="willpower_current" label="Força de Vontade" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="order" label="Ordem" placeholder="Silver Ladder, Adamantine Arrow..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="path" label="Caminho" placeholder="Acanthus, Mastigos..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="concept" label="Conceito" canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="notes" label="Notas" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
