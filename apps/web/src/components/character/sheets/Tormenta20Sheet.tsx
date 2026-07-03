'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Attr { id: string; value: number; customDie: string | null; attribute: { name: string; defaultDie: string; description?: string | null } }
interface TextField { id: string; key: string; label: string; value: string; order: number }
interface Props { characterId: string; characterLevel: number; attributes: Attr[]; textFields: TextField[]; weapons?: unknown[]; spellSlots?: unknown[]; canEdit: boolean }

const ACCENT = '#991b1b'
const RED = '#f87171'
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

function Dots({ value, max = 5, editable = false, attrId, characterId, onSaved, color = GOLD }: {
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
  const cls = 'w-full bg-parchment/40 border border-ink/15 rounded-lg text-sm text-ink-soft placeholder-ink-soft/40 focus:outline-none focus:border-red-700/50 focus:bg-parchment/60 px-3 py-2 transition-colors'
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

// Tormenta20 base attrs are the same 6 as D&D but in PT-BR
const BASE_STATS = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
const STAT_ABBR = ['For', 'Des', 'Con', 'Int', 'Sab', 'Car']

export function Tormenta20Sheet({ characterId, characterLevel, attributes, textFields, canEdit }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'atributos' | 'combate' | 'pericias' | 'magias' | 'personagem'>('atributos')
  const onRefresh = () => router.refresh()

  const baseStats = attributes.filter(a => BASE_STATS.includes(a.attribute.name))
  const saves = attributes.filter(a => a.attribute.description?.startsWith('Salvaguarda'))
  const skills = attributes.filter(a => a.attribute.description?.startsWith('Perícia'))
  const other = attributes.filter(a => !baseStats.includes(a) && !saves.includes(a) && !skills.includes(a))

  function getStat(idx: number) { return baseStats.find(a => a.attribute.name === BASE_STATS[idx])?.value ?? 10 }

  const card = 'rounded-xl p-4' as const
  const cardStyle = { background: 'rgba(247,239,221,0.92)', border: '1px solid rgba(51,41,29,0.14)' }
  const tabs = [
    { id: 'atributos', label: 'Atributos' },
    { id: 'combate', label: 'Combate' },
    { id: 'pericias', label: 'Perícias' },
    { id: 'magias', label: 'Magias' },
    { id: 'personagem', label: 'Personagem' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${ACCENT}40`, border: `1px solid ${RED}40` }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: RED }} />
          <span className="font-cinzel text-sm font-bold" style={{ color: RED }}>Tormenta20</span>
        </div>
        <span className="text-xs text-ink-soft">Nível {characterLevel}</span>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(51,41,29,0.08)', border: '1px solid rgba(51,41,29,0.05)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={tab === t.id ? { background: RED, color: '#fff' } : { color: 'rgba(51,41,29,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'atributos' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Atributos" />
          <div className="grid grid-cols-3 gap-3">
            {BASE_STATS.map((name, i) => {
              const a = baseStats.find(x => x.attribute.name === name)
              const m = mod(a?.value ?? 10)
              return (
                <div key={name} className="rounded-lg p-3 text-center space-y-1" style={{ background: 'rgba(51,41,29,0.08)' }}>
                  <div className="text-[10px] font-bold text-ink-soft uppercase">{STAT_ABBR[i]}</div>
                  <div className="text-2xl font-cinzel font-bold" style={{ color: RED }}>{a?.value ?? 10}</div>
                  <div className="text-sm font-bold text-ink-soft">{fmtMod(m)}</div>
                  {a && <Dots value={a.value} max={20} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} color={RED} />}
                </div>
              )
            })}
          </div>
          {other.length > 0 && (
            <div className="mt-4">
              <SectionDivider title="Outros" />
              {other.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
                  <span className="text-sm text-ink-soft">{a.attribute.name}</span>
                  <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} color={RED} />
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
              <TFField characterId={characterId} textFields={textFields} tfKey="defense" label="Defesa" placeholder="10" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="initiative" label="Iniciativa" placeholder={fmtMod(mod(getStat(1)))} canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="hp_max" label="PV Máx." placeholder="8" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="hp_current" label="PV Atual" placeholder="8" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="pm_max" label="PM Máx." placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="pm_current" label="PM Atual" placeholder="0" canEdit={canEdit} onRefresh={onRefresh} />
            </div>
          </div>
          <div className={card} style={cardStyle}>
            <SectionDivider title="Testes de Resistência" />
            {saves.length > 0
              ? saves.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
                    <span className="text-sm text-ink-soft">{a.attribute.name.replace(/^Salvaguarda — /, '')}</span>
                    <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} color={RED} />
                  </div>
                ))
              : (
                <div className="grid grid-cols-3 gap-3">
                  <TFField characterId={characterId} textFields={textFields} tfKey="save_fort" label="Fortitude" placeholder={fmtMod(mod(getStat(2)))} canEdit={canEdit} onRefresh={onRefresh} />
                  <TFField characterId={characterId} textFields={textFields} tfKey="save_ref" label="Reflexo" placeholder={fmtMod(mod(getStat(1)))} canEdit={canEdit} onRefresh={onRefresh} />
                  <TFField characterId={characterId} textFields={textFields} tfKey="save_will" label="Vontade" placeholder={fmtMod(mod(getStat(4)))} canEdit={canEdit} onRefresh={onRefresh} />
                </div>
              )
            }
          </div>
        </div>
      )}

      {tab === 'pericias' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Perícias" />
          {skills.length > 0
            ? skills.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-ink/10 last:border-0">
                  <span className="text-sm text-ink-soft">{a.attribute.name.replace(/^Perícia — /, '')}</span>
                  <Dots value={a.value} editable={canEdit} attrId={a.id} characterId={characterId} onSaved={onRefresh} color={RED} />
                </div>
              ))
            : <TFField characterId={characterId} textFields={textFields} tfKey="skills_text" label="Perícias" placeholder="Acrobacia +5, Atletismo +3..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          }
        </div>
      )}

      {tab === 'magias' && (
        <div className="space-y-3">
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="spells_known" label="Magias Conhecidas" placeholder="Liste suas magias por círculo..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
          <div className={card} style={cardStyle}>
            <TFField characterId={characterId} textFields={textFields} tfKey="powers_list" label="Poderes / Habilidades de Classe" placeholder="Liste seus poderes..." multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {tab === 'personagem' && (
        <div className={card} style={cardStyle}>
          <SectionDivider title="Personagem" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TFField characterId={characterId} textFields={textFields} tfKey="class" label="Classe" placeholder="Guerreiro, Arcanista..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="race" label="Raça" placeholder="Humano, Elfo, Dahllan..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="origin" label="Origem" placeholder="Amnésico, Acólito..." canEdit={canEdit} onRefresh={onRefresh} />
              <TFField characterId={characterId} textFields={textFields} tfKey="deity" label="Divindade" placeholder="Tanna-Toh, Valkaria..." canEdit={canEdit} onRefresh={onRefresh} />
            </div>
            <TFField characterId={characterId} textFields={textFields} tfKey="feats" label="Poderes" placeholder="Liste seus poderes e habilidades..." multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="backstory" label="História" multiline canEdit={canEdit} onRefresh={onRefresh} />
            <TFField characterId={characterId} textFields={textFields} tfKey="notes" label="Notas" multiline canEdit={canEdit} onRefresh={onRefresh} />
          </div>
        </div>
      )}
    </div>
  )
}
