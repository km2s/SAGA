'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; spellSlots?: unknown[]; canEdit: boolean }

const ACCENT = '#b45309'
const GOLD = '#c9a22a'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-[0.2em] whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px" style={{ background: `${GOLD}33` }} />
    </div>
  )
}

function mod(score: number) { return Math.floor((score - 10) / 2) }
function fmtMod(m: number) { return m >= 0 ? `+${m}` : `${m}` }

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved }: {
  value: number; max?: number; editable?: boolean; attrId?: string; characterId?: string; onSaved?: () => void
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
          style={{ background: i < value ? GOLD : 'transparent', borderColor: GOLD }} />
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-amber-700/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
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

function AttrRow({ a, characterId, canEdit, onSaved }: { a: Attr; characterId: string; canEdit: boolean; onSaved: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
      <span className="text-sm text-ink-soft">{a.attribute.name}</span>
      <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onSaved} />
    </div>
  )
}

const BASE_STATS = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma',
  'Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']

export function Pathfinder1eSheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'combate' | 'pericias' | 'magias' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()

  const baseStats = attributes.filter(a => BASE_STATS.some(n => a.attribute.name === n))
  const skills = attributes.filter(a =>
    a.attribute.description?.startsWith('Perícia') ||
    a.attribute.description?.startsWith('Skill')
  )
  const other = attributes.filter(a => !baseStats.includes(a) && !skills.includes(a))

  function getScore(name: string) {
    return baseStats.find(a => a.attribute.name === name || a.attribute.name === BASE_STATS[BASE_STATS.indexOf(name) + 6])?.value ?? 10
  }

  const strMod = mod(getScore('Força') || getScore('Strength'))
  const dexMod = mod(getScore('Destreza') || getScore('Dexterity'))
  const conMod = mod(getScore('Constituição') || getScore('Constitution'))
  const intMod = mod(getScore('Inteligência') || getScore('Intelligence'))
  const wisMod = mod(getScore('Sabedoria') || getScore('Wisdom'))
  const chaMod = mod(getScore('Carisma') || getScore('Charisma'))

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgb(var(--card) / 0.92)', border: '1px solid rgb(var(--ink) / 0.14)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'combate', label: 'Combate' },
    { id: 'pericias', label: 'Perícias' },
    { id: 'magias', label: 'Magias' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}30`, border: `1px solid ${GOLD}40` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: GOLD }}>Pathfinder 1e</span>
        </div>
        <span className="text-xs text-ink-soft">Nível {characterLevel}</span>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgb(var(--ink) / 0.08)', border: '1px solid rgb(var(--ink) / 0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: GOLD, color: '#000' } : { color: 'rgb(var(--ink) / 0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Atributos Base" />
          <div className="grid grid-cols-3 gap-3">
            {[
              ['For', 'Força', strMod], ['Des', 'Destreza', dexMod], ['Con', 'Constituição', conMod],
              ['Int', 'Inteligência', intMod], ['Sab', 'Sabedoria', wisMod], ['Car', 'Carisma', chaMod],
            ].map(([abbr, label, m]) => {
              const a = baseStats.find(x => x.attribute.name === label || x.attribute.name === String(abbr))
              return (
                <div key={String(abbr)} className="rounded-lg p-3 text-center space-y-1" style={{ background: 'rgb(var(--ink) / 0.08)' }}>
                  <div className="text-[10px] font-bold text-ink-soft uppercase">{abbr}</div>
                  <div className="text-2xl font-cinzel font-bold" style={{ color: GOLD }}>{a?.value ?? 10}</div>
                  <div className="text-sm font-bold text-ink-soft">{fmtMod(Number(m))}</div>
                  {a && <Dots value={a.value} max={20} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} />}
                </div>
              )
            })}
          </div>
          {other.length > 0 && (
            <div className="mt-4">
              <SectionDivider title="Outros" />
              {other.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'combate' && (
        <div className="space-y-4">
          <div className={card} style={cardStyle}>
            <SectionDivider title="Combate" />
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="bab" label="BAB" placeholder="+1" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="initiative" label="Iniciativa" placeholder={fmtMod(dexMod)} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="ac" label="CA (AC)" placeholder="10" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="hp_max" label="PV Máx." placeholder="8" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="hp_current" label="PV Atual" placeholder="8" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="speed" label="Deslocamento" placeholder="9m" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Testes de Resistência" />
            <div className="grid grid-cols-3 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="save_fort" label="Fortitude" placeholder={fmtMod(conMod)} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="save_ref" label="Reflexo" placeholder={fmtMod(dexMod)} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="save_will" label="Vontade" placeholder={fmtMod(wisMod)} canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Manobras de Combate" />
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="cmb" label="CMB" placeholder={fmtMod(strMod)} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="cmd" label="CMD" placeholder="10" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      )}

      {tab === 'pericias' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Perícias" />
          {skills.length > 0
            ? skills.map(a => <AttrRow key={a.id} a={a} characterId={characterId} canEdit={canEdit} onSaved={onRefresh} />)
            : <TFField characterId={characterId} textFields={textFields} tfKey="skills_text" label="Perícias" placeholder="Acrobacia +5, Furtividade +3..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          }
        </div>
      )}

      {tab === 'magias' && (
        <div className="space-y-3">
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="spells_per_day" label="Magias por Dia" placeholder="Nível 0: ∞, Nível 1: 3+1, Nível 2: 2+1..." multiline canEdit={canEdit} onRefresh={onRefresh} />
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
              <TFField characterId={characterId} textFields={textFields} tfKey="class" label="Classe" placeholder="Guerreiro, Mago..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="race" label="Raça" placeholder="Humano, Elfo..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="alignment" label="Alinhamento" placeholder="Leal Bom, Caótico Neutro..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="deity" label="Divindade" placeholder="Iomedae, Gorum..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="feats" label="Talentos (Feats)" placeholder="Liste seus talentos..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="traits" label="Traços" placeholder="Liste seus traços..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
