'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; canEdit: boolean }

const ACCENT = '#2d6a1a'
const GREEN = '#4ade80'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(74,222,128,0.2)' }} />
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

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = GREEN }: {
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-green-700/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
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

// Track component for Rage / Gnosis / Willpower (boxes 1-10)
function BoxTrack({ label, tfKey, textFields, characterId, canEdit, onRefresh, max = 10, color = GREEN }: {
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
      <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
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

// 5 Garou forms table
const FORMS = [
  { name: 'Hominid',    str: '+0', dex: '+0', sta: '+0', man: '+0', app: '+0', notes: 'Forma humana' },
  { name: 'Glabro',     str: '+2', dex: '+0', sta: '+2', man: '-1', app: '-1', notes: 'Semi-humana' },
  { name: 'Crinos',     str: '+4', dex: '+1', sta: '+3', man: '-3', app: '0',  notes: 'Wolfman — Delirium' },
  { name: 'Hispo',      str: '+3', dex: '+2', sta: '+3', man: '-3', app: '+0', notes: 'Lobo-gigante' },
  { name: 'Lupus',      str: '+1', dex: '+2', sta: '+2', man: '-3', app: '+0', notes: 'Forma lobo' },
]

export function WerewolfSheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'dons' | 'recursos' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()
  const { physical, social, mental, talents, skills, knowledges, resources } = categorize(attributes)

  const renown = resources.filter(a => ['Glória', 'Honra', 'Sabedoria'].includes(a.attribute.name))
  const gifts = resources.filter(a => !['Glória', 'Honra', 'Sabedoria', 'Gnosis', 'Raiva', 'Força de Vontade'].includes(a.attribute.name))
  const rageAttr = resources.find(a => a.attribute.name.toLowerCase().includes('raiva') || a.attribute.name.toLowerCase().includes('rage'))
  const gnosisAttr = resources.find(a => a.attribute.name.toLowerCase().includes('gnosis'))

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'dons', label: 'Dons' },
    { id: 'recursos', label: 'Recursos' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${ACCENT}40`, border: `1px solid ${GREEN}40` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
        <span className="font-cinzel text-sm font-bold" style={{ color: GREEN }}>Werewolf: The Apocalypse</span>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(51,41,29,0.08)', border: '1px solid rgba(51,41,29,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: GREEN, color: '#000' } : { color: 'rgba(51,41,29,0.4)' }}>
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

      {tab === 'dons' && (
        <div className="space-y-4">
          {/* Renown */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Renome" />
            {renown.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)}
          </div>
          {/* Gifts */}
          {gifts.length > 0 && (
            <div className={card} style={cardStyle}>
              <SectionDivider title="Dons" />
              {gifts.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)}
            </div>
          )}
          {/* Gifts text */}
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="gifts_text" label="Dons (descrição)" placeholder="Liste seus dons e efeitos..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          {/* 5 Forms table */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="5 Formas Garou" />
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-ink/15">
                    {['Forma', 'For', 'Des', 'Vig', 'Man', 'Apa', 'Notas'].map(h => (
                      <th key={h} className="text-left py-1.5 px-1 text-ink-soft font-bold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FORMS.map(f => (
                    <tr key={f.name} className="border-b border-ink/10">
                      <td className="py-1.5 px-1 font-bold" style={{ color: GREEN }}>{f.name}</td>
                      <td className="py-1.5 px-1 text-ink-soft">{f.str}</td>
                      <td className="py-1.5 px-1 text-ink-soft">{f.dex}</td>
                      <td className="py-1.5 px-1 text-ink-soft">{f.sta}</td>
                      <td className="py-1.5 px-1 text-ink-soft">{f.man}</td>
                      <td className="py-1.5 px-1 text-ink-soft">{f.app}</td>
                      <td className="py-1.5 px-1 text-ink-soft text-[10px]">{f.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'recursos' && (
        <div className="space-y-4">
          {/* Rage & Gnosis as tracks */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Raiva / Gnosis / Força de Vontade" />
            <div className="space-y-4">
              {rageAttr
                ? <div className="flex items-center justify-between"><span className="text-sm text-ink-soft">Raiva</span><Dots value={rageAttr.value} max={10} editable={canEdit} attrId={rageAttr.id} characterId={characterId} onSaved={onRefresh} color="#ef4444" /></div>
                : <BoxTrack label="Raiva (atual)" tfKey="rage_current" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} color="#ef4444" />
              }
              {gnosisAttr
                ? <div className="flex items-center justify-between"><span className="text-sm text-ink-soft">Gnosis</span><Dots value={gnosisAttr.value} max={10} editable={canEdit} attrId={gnosisAttr.id} characterId={characterId} onSaved={onRefresh} /></div>
                : <BoxTrack label="Gnosis (atual)" tfKey="gnosis_current" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} />
              }
              <BoxTrack label="Força de Vontade (atual)" tfKey="willpower_current" textFields={textFields} characterId={characterId} canEdit={canEdit} onRefresh={onRefresh} color="#a78bfa" />
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="breed" label="Raça" placeholder="Homid, Lupus..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="auspice" label="Auspício" placeholder="Ragabash, Theurge..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="tribe" label="Tribo" placeholder="Black Fury, Bone Gnawer..." canEdit={canEdit} onRefresh={onRefresh} />
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
