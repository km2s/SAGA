'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; canEdit: boolean }

const ACCENT = '#5b21b6'
const PURPLE = '#a78bfa'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.2)' }} />
    </div>
  )
}

function categorize(attrs: Attr[]) {
  const physical: Attr[] = [], social: Attr[] = [], mental: Attr[] = []
  const talents: Attr[] = [], skills: Attr[] = [], knowledges: Attr[] = []
  const spheres: Attr[] = []; const resources: Attr[] = []
  const SPHERE_NAMES = ['Correspondência', 'Entropia', 'Forças', 'Matéria', 'Mente', 'Primo', 'Espírito', 'Tempo', 'Vida',
    'Correspondence', 'Entropy', 'Forces', 'Matter', 'Mind', 'Prime', 'Spirit', 'Time', 'Life']
  for (const a of attrs) {
    const d = a.attribute.description ?? ''
    const name = a.attribute.name
    if      (d.startsWith('Físico'))       physical.push(a)
    else if (d.startsWith('Social'))       social.push(a)
    else if (d.startsWith('Mental'))       mental.push(a)
    else if (d.startsWith('Talento'))      talents.push(a)
    else if (d.startsWith('Perícia'))      skills.push(a)
    else if (d.startsWith('Conhecimento')) knowledges.push(a)
    else if (SPHERE_NAMES.some(s => name.includes(s))) spheres.push(a)
    else                                   resources.push(a)
  }
  return { physical, social, mental, talents, skills, knowledges, spheres, resources }
}

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = PURPLE }: {
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-purple-700/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
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

export function MageAscSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'esferas' | 'recursos' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()
  const { physical, social, mental, talents, skills, knowledges, spheres, resources } = categorize(attributes)

  const areteAttr = resources.find(a => a.attribute.name.toLowerCase().includes('arete') || a.attribute.name.toLowerCase().includes('arête'))

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'esferas', label: 'Esferas' },
    { id: 'recursos', label: 'Recursos' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}40`, border: `1px solid ${PURPLE}40` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: PURPLE }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: PURPLE }}>Mage: The Ascension</span>
        </div>
        {areteAttr && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-soft">Arete</span>
            <span className="font-cinzel font-bold text-sm" style={{ color: PURPLE }}>{areteAttr.value}</span>
            <Dots value={areteAttr.value} max={10} editable={canEdit} attrId={areteAttr.id} characterId={characterId} onSaved={onRefresh} />
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgb(var(--ink) / 0.08)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: PURPLE, color: '#000' } : { color: 'rgb(var(--ink) / 0.4)' }}>
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

      {tab === 'esferas' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="9 Esferas da Magia" />
          {spheres.length > 0
            ? <div className="space-y-1">
                {spheres.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} color={PURPLE} />)}
              </div>
            : (
              <TFField characterId={characterId} textFields={textFields} tfKey="spheres_text"
                label="Esferas (Correspondência, Entropia, Forças, Matéria, Mente, Primo, Espírito, Tempo, Vida)"
                placeholder="Liste suas esferas e níveis..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            )
          }
        </div>
      )}

      {tab === 'recursos' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Recursos" />
            {resources.filter(a => !a.attribute.name.toLowerCase().includes('arete')).map(a => (
              <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} color={PURPLE} />
            ))}
          </div>
          <div className={card} style={cardStyle}>
            <div className="grid grid-cols-3 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="quintessence" label="Quintessência (atual)" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="paradox" label="Paradoxo" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
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
              <TFField characterId={characterId} textFields={textFields} tfKey="tradition" label="Tradição" placeholder="Verbena, Euthanatos..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="essence" label="Essência" placeholder="Dynamism, Primordialism..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="paradigm" label="Paradigma" placeholder="Sua visão de mundo e magia..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="notes" label="Notas" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
