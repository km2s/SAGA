'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; spellSlots?: unknown[]; canEdit: boolean }

const ACCENT = '#7f1d1d'
const RED = '#f87171'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-saga-dim uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${RED}33` }} />
    </div>
  )
}

function mod(score: number) { return Math.floor((score - 10) / 2) }
function fmtMod(m: number) { return m >= 0 ? `+${m}` : `${m}` }

// PF2e proficiency ranks
const PROF = ['—', 'T', 'E', 'M', 'L']
const PROF_LABEL = ['—', 'Treinado', 'Especialista', 'Mestre', 'Lendário']

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = RED }: {
  value: number; max?: number; editable?: boolean; attrId?: string; characterId?: string; onSaved?: () => void; color?: string
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
          className={`w-3 h-3 rounded border transition-colors ${editable ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ background: i < value ? color : 'transparent', borderColor: color }} />
      ))}
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
  const cls = 'w-full bg-surface-2/50 border border-white/10 rounded-lg text-sm text-saga-muted placeholder-saga-dim/40 focus:outline-none focus:border-red-700/50 focus:bg-surface-2 px-3 py-2 transition-colors'
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

// ProfSelector: cycle through 0-4 proficiency ranks
function ProfSelector({ attrId, value, characterId, canEdit, onSaved }: { attrId: string; value: number; characterId: string; canEdit: boolean; onSaved: () => void }) {
  async function next() {
    if (!canEdit) return
    const newVal = (value + 1) % 5
    await fetch(`/api/characters/${characterId}/attributes/${attrId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newVal }),
    }).catch(() => null)
    onSaved()
  }
  return (
    <button type="button" onClick={() => void next()} title={PROF_LABEL[value]}
      className="w-8 h-6 rounded text-[11px] font-bold transition-colors"
      style={{ background: value ? `${RED}30` : 'rgba(0,0,0,0.4)', color: value ? RED : 'rgba(255,255,255,0.2)', border: `1px solid ${value ? RED : 'rgba(255,255,255,0.1)'}` }}>
      {PROF[value]}
    </button>
  )
}

const BASE_STATS = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']

export function Pathfinder2eSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'combate' | 'pericias' | 'magias' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()

  const baseStats = attributes.filter(a => BASE_STATS.some(n => a.attribute.name.includes(n.split(' ')[0]!)))
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia'))
  const other = attributes.filter(a => !baseStats.includes(a) && !skills.includes(a))

  function getStat(name: string) { return baseStats.find(a => a.attribute.name.includes(name))?.value ?? 10 }

  const dying = parseInt(textFields.find(f => f.key === 'dying')?.value ?? '0')
  const heroPoints = parseInt(textFields.find(f => f.key === 'hero_points')?.value ?? '0')

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(17,17,30,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'combate', label: 'Combate' },
    { id: 'pericias', label: 'Perícias' },
    { id: 'magias', label: 'Magias' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  async function saveNum(key: string, label: string, v: number) {
    await fetch(`/api/characters/${characterId}/text-fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, value: String(v) }),
    }).catch(() => null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}40`, border: `1px solid ${RED}40` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: RED }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: RED }}>Pathfinder 2e</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-saga-dim">Nível {characterLevel}</span>
          <div className="flex items-center gap-1">
            <span className="text-saga-dim">Hero Points</span>
            {[1, 2, 3].map(n => (
              <button key={n} type="button" onClick={() => canEdit && void saveNum('hero_points', 'Hero Points', n === heroPoints ? n - 1 : n)}
                className="w-5 h-5 rounded-full border transition-colors"
                style={{ background: n <= heroPoints ? RED : 'transparent', borderColor: RED }} />
            ))}
          </div>
        </div>
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
        <div className={card} style={cardStyle}>
          <SectionDivider title="Atributos Base" />
          <div className="grid grid-cols-3 gap-3">
            {[
              ['For', 'Força'], ['Des', 'Destreza'], ['Con', 'Constituição'],
              ['Int', 'Inteligência'], ['Sab', 'Sabedoria'], ['Car', 'Carisma'],
            ].map(([abbr, name]) => {
              const a = baseStats.find(x => x.attribute.name.includes(name!.split(' ')[0]!))
              const m = mod(a?.value ?? 10)
              return (
                <div key={abbr} className="rounded-lg p-3 text-center space-y-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-[10px] font-bold text-saga-dim uppercase">{abbr}</div>
                  <div className="text-2xl font-cinzel font-bold" style={{ color: RED }}>{fmtMod(m)}</div>
                  {a && <Dots value={a.value} max={20} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} />}
                </div>
              )
            })}
          </div>
          {other.length > 0 && (
            <div className="mt-4">
              <SectionDivider title="Outros" />
              {other.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-sm text-saga-muted">{a.attribute.name}</span>
                  <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'combate' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Combate" />
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="ac" label="CA" placeholder="10" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="hp_max" label="PV Máx." placeholder="8" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="hp_current" label="PV Atual" placeholder="8" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="speed" label="Deslocamento" placeholder="9m" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
          {/* Dying / Wounded tracker */}
          <div className={card} style={cardStyle}>
            <SectionDivider title="Moribundo / Ferido" />
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-saga-dim uppercase tracking-wider mb-1.5 block">Moribundo (Dying 0-4)</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map(n => (
                    <button key={n} type="button" onClick={() => canEdit && void saveNum('dying', 'Moribundo', n)}
                      className="flex-1 py-1.5 rounded text-[11px] font-bold transition-all"
                      style={{ background: n === dying ? RED : 'rgba(0,0,0,0.4)', color: n === dying ? '#fff' : 'rgba(255,255,255,0.4)', border: `1px solid ${n === dying ? RED : 'rgba(255,255,255,0.1)'}` }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <TFField characterId={characterId} textFields={textFields} tfKey="wounded" label="Ferido (Wounded)" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Testes de Resistência" />
            <div className="grid grid-cols-3 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="save_fort" label="Fortitude" placeholder={fmtMod(mod(getStat('Con')))} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="save_ref" label="Reflexo" placeholder={fmtMod(mod(getStat('Des')))} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="save_will" label="Vontade" placeholder={fmtMod(mod(getStat('Sab')))} canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}

      {tab === 'pericias' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Perícias (clique no rank para ciclar)" />
          {skills.length > 0
            ? skills.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-sm text-saga-muted">{a.attribute.name}</span>
                  <div className="flex items-center gap-2">
                    <ProfSelector attrId={a.id} value={Math.min(a.value, 4)} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />
                    <span className="text-[11px] text-saga-dim w-6 text-right">{fmtMod(mod(getStat(a.attribute.name)) + (a.value > 0 ? a.value * 2 + characterLevel : 0))}</span>
                  </div>
                </div>
              ))
            : <TFField characterId={characterId} textFields={textFields} tfKey="skills_text" label="Perícias" placeholder="Acrobacia T +7, Magia E +12..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          }
        </div>
      )}

      {tab === 'magias' && (
        <div className="space-y-3">
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="spell_slots" label="Espaços de Magia" placeholder="Nível 1: 2, Nível 2: 2..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="spells_known" label="Magias Conhecidas" placeholder="Liste as magias por nível..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="class" label="Classe" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="ancestry" label="Ancestralidade" placeholder="Humano, Anão, Elfo..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="background" label="Background" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="alignment" label="Alinhamento" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="feats" label="Talentos" placeholder="Liste seus talentos..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
