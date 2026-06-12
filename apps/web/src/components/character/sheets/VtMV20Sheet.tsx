'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; canEdit: boolean }

const ACCENT = '#7c1818'
const RED = '#dc2626'

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

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = RED }: {
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
  const cls = 'w-full bg-surface-2/50 border border-white/10 rounded-lg text-sm text-saga-muted placeholder-saga-dim/40 focus:outline-none focus:border-red-900/50 focus:bg-surface-2 px-3 py-2 transition-colors'
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

// Health track with WoD penalties
function HealthTrack({ characterId, textFields, canEdit, onRefresh }: { characterId: string; textFields: TextField[]; canEdit: boolean; onRefresh: () => void }) {
  const existing = textFields.find(f => f.key === 'healthTrack')?.value ?? '00000000'
  const [track, setTrack] = useState(existing.split('').map(Number))
  // WoD V20 wound levels: Bruised(0), Hurt(-1), Injured(-1), Wounded(-2), Mauled(-2), Crippled(-5), Incapacitated
  const LEVELS = [
    'Contundido (0)', 'Machucado (−1)', 'Ferido (−1)',
    'Lacerado (−2)', 'Mutilado (−2)', 'Aleijado (−5)', 'Incapacitado',
  ]
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
      {LEVELS.map((lbl, i) => (
        <div key={i} className="flex items-center gap-3">
          <button type="button" onClick={() => void toggle(i)} disabled={!canEdit}
            className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${track[i] ? 'bg-red-800' : 'bg-transparent'}`}
            style={{ borderColor: RED }} />
          <span className="text-[11px] text-saga-dim">{lbl}</span>
        </div>
      ))}
    </div>
  )
}

// Generation table: [max blood pool, max trait, blood spent per round]
const GEN_TABLE: Record<number, [number, number, number]> = {
  3: [100, 10, 10], 4: [50, 9, 8], 5: [40, 8, 6],
  6: [30, 7, 4], 7: [20, 6, 3], 8: [15, 5, 2],
  9: [14, 5, 2], 10: [13, 5, 1], 11: [12, 4, 1],
  12: [11, 3, 1], 13: [10, 3, 1], 15: [10, 3, 1],
}

export function VtMV20Sheet({ characterId, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'habilidades' | 'vantagens' | 'recursos' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()
  const { physical, social, mental, talents, skills, knowledges, resources } = categorize(attributes)

  const genAttr = attributes.find(a => a.attribute.name.toLowerCase().includes('geração') || a.attribute.name.toLowerCase().includes('generation'))
  const genNum = genAttr?.value ?? 13
  const genRow = GEN_TABLE[genNum]

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'vantagens', label: 'Vantagens' },
    { id: 'recursos', label: 'Recursos' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${ACCENT}40`, border: `1px solid ${RED}40` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: RED }} />
        <span className="font-cinzel text-sm font-bold" style={{ color: RED }}>Vampire: The Masquerade V20</span>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: RED, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
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

      {tab === 'vantagens' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Disciplinas / Antecedentes / Virtudes" />
            {resources.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-saga-muted">{a.attribute.name}</span>
                <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'recursos' && (
        <div className="space-y-4">
          {/* Geração */}
          {genAttr && (
            <div className={card} style={cardStyle}>
              <SectionDivider title="Geração" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-saga-muted">Geração</span>
                <div className="flex items-center gap-2">
                  <Dots value={genAttr.value} max={15} editable={canEdit} attrId={genAttr.id} characterId={characterId} onSaved={onRefresh} color={RED} />
                  <span className="font-cinzel font-bold text-red-400 text-sm ml-2">{genAttr.value}ª</span>
                </div>
              </div>
              {genRow && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[['Pool Máx.', genRow[0]], ['Traço Máx.', genRow[1]], ['Sangue/Round', genRow[2]]].map(([lbl, v]) => (
                    <div key={String(lbl)} className="rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-[8px] text-saga-dim uppercase tracking-wider">{lbl}</div>
                      <div className="text-sm font-bold text-red-300 mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Saúde */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Saúde" />
            <HealthTrack characterId={characterId} textFields={textFields} canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          {/* Recursos numéricos */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Vitalidade / Força de Vontade / Humanidade" />
            <div className="space-y-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="blood_current" label="Pool de Sangue (atual)" placeholder="10" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="willpower_current" label="Força de Vontade (atual)" placeholder="5" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="humanity" label="Humanidade / Via" placeholder="7" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="clan" label="Clã" placeholder="Brujah, Gangrel..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="sect" label="Seita" placeholder="Camarilla, Sabbat..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="nature" label="Natureza" placeholder="Arquétipo..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="demeanor" label="Comportamento" placeholder="Arquétipo..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="concept" label="Conceito" placeholder="Quem você era..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="haven" label="Refúgio" placeholder="Localização do Haven..." canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" placeholder="Sua história..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="notes" label="Notas" placeholder="Anotações..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
