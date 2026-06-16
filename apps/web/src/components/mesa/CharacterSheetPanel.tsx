'use client'

import { useState, useCallback, useEffect } from 'react'
import { Swords, Sparkles, Shield, Sword, Plus, Minus, Axe, Leaf, Music, Target, Dumbbell, Moon, ScrollText, User, ClipboardList, X, FileText, ChevronRight, Skull, ArrowLeft, StickyNote, Loader2 } from 'lucide-react'
import { CharacterSheetView, type SheetCategory } from '@/components/character/CharacterSheetView'

interface CharAttr {
  id: string
  value: number
  name: string
  defaultDie: string
}

interface CharData {
  id: string
  name: string
  race: string | null
  class: string | null
  level: number
  hp: number
  maxHp: number
  attributes: CharAttr[]
}

interface NpcData {
  id: string
  name: string
  type: string
  race: string | null
  class: string | null
  level: number
  hp: number
  maxHp: number
  attributes: CharAttr[]
}

interface MesaMember {
  id: string
  role: string
  user: { username: string }
  character: CharData | null
}

interface FullCharData {
  level: number
  systemName: string | null
  canEdit: boolean
  attributes: {
    id: string; value: number; customDie: string | null
    attribute: { name: string; defaultDie: string; description?: string | null }
  }[]
  textFields: { id: string; key: string; label: string; value: string; order: number }[]
  weapons: { id: string; name: string; attackBonus: string | null; damage: string | null; damageType: string | null; range: string | null; properties: string | null; order: number }[]
  spellSlots: { id: string; level: number; total: number; used: number }[]
}

interface Props {
  onClose: () => void
  members: MesaMember[]
  npcs: NpcData[]
  currentMemberId: string
  isGM: boolean
  campaignId: string
  systemName: string | null
  hpOverrides?: Record<string, number>
  onHpChange?: (id: string, hp: number) => void
}

const CLASS_ICONS: Record<string, React.ElementType> = {
  Guerreiro: Swords, Mago: Sparkles, Paladino: Shield, Ladino: Sword, Clérigo: Plus,
  Bárbaro: Axe, Druida: Leaf, Bardo: Music, Ranger: Target, Monge: Dumbbell,
  Feiticeiro: Sparkles, Bruxo: Moon, Arcanista: ScrollText,
}

const NPC_TYPE_COLOR: Record<string, string> = {
  ALLY:    '#22c55e',
  NEUTRAL: '#c9a22a',
  ENEMY:   '#ef4444',
}

const NPC_TYPE_LABEL: Record<string, string> = {
  ALLY:    'Aliado',
  NEUTRAL: 'Neutro',
  ENEMY:   'Inimigo',
}

const CORE_NAMES = new Set(['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'])
const ATTR_ABBREV: Record<string, string> = {
  'Força': 'FOR', 'Destreza': 'DES', 'Constituição': 'CON',
  'Inteligência': 'INT', 'Sabedoria': 'SAB', 'Carisma': 'CAR',
}

const SYSTEM_CATEGORIES: Record<string, SheetCategory> = {
  'D&D 5e': 'fantasy', 'D&D 3.5e': 'fantasy', 'Pathfinder 2e': 'fantasy',
  'Pathfinder 1e': 'fantasy', 'Tormenta20': 'fantasy', 'Old Dragon 2': 'fantasy',
  'Dungeon World': 'fantasy', '13th Age': 'fantasy',
  'Vampire: The Masquerade V5': 'world-of-darkness',
  'Vampire: The Masquerade V20': 'world-of-darkness',
  'Vampire: The Masquerade': 'world-of-darkness',
  'Werewolf: The Apocalypse': 'world-of-darkness',
  'Mage: The Ascension': 'world-of-darkness',
  'Mage: The Awakening': 'world-of-darkness',
  'Hunter: The Reckoning': 'world-of-darkness',
  'Changeling: The Lost': 'world-of-darkness',
  'Demon: The Descent': 'world-of-darkness',
  'Geist: The Sin-Eaters': 'world-of-darkness',
  'Call of Cthulhu 7e': 'horror', 'Delta Green': 'horror', 'Mothership': 'horror',
  'Cyberpunk Red': 'scifi', 'Starfinder': 'scifi', 'Shadowrun 6e': 'scifi',
  'Star Wars: Edge of the Empire': 'scifi',
  'GURPS 4e': 'generic', 'Fate Core': 'generic', 'Savage Worlds': 'generic',
  'Blades in the Dark': 'generic', 'Ironsworn': 'generic',
  'Personalizado': 'custom',
}

function detectCategory(name: string | null | undefined): SheetCategory {
  if (!name) return 'custom'
  const exact = SYSTEM_CATEGORIES[name]
  if (exact) return exact
  const n = name.toLowerCase()
  if (n.includes('vampire') || n.includes('werewolf') || n.includes('mage') ||
      n.includes('hunter') || n.includes('changeling') || n.includes('demon') ||
      n.includes('geist') || n.includes('masquerade') || n.includes('darkness'))
    return 'world-of-darkness'
  if (n.includes('cthulhu') || n.includes('horror') || n.includes('mothership') || n.includes('delta green'))
    return 'horror'
  if (n.includes('cyberpunk') || n.includes('starfinder') || n.includes('shadowrun') || n.includes('star wars'))
    return 'scifi'
  if (n.includes('d&d') || n.includes('pathfinder') || n.includes('tormenta') || n.includes('dungeon'))
    return 'fantasy'
  return 'custom'
}

function dndMod(v: number) {
  const m = Math.floor((v - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function HPEditor({ initialHp, maxHp, canEdit, onSave }: {
  initialHp: number; maxHp: number; canEdit: boolean; onSave: (hp: number) => void
}) {
  const [hp, setHp] = useState(initialHp)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  const pct = maxHp > 0 ? Math.min(100, Math.round((hp / maxHp) * 100)) : 0
  const color = pct > 60 ? '#22c55e' : pct > 30 ? '#f59e0b' : '#ef4444'

  function apply(newHp: number) {
    const clamped = Math.min(maxHp, Math.max(0, newHp))
    if (clamped === hp) return
    setHp(clamped)
    setSaving(true)
    Promise.resolve(onSave(clamped)).finally(() => setSaving(false))
  }

  function commitInput() {
    const n = parseInt(inputVal, 10)
    if (!isNaN(n)) apply(n)
    setEditing(false)
  }

  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-saga-dim uppercase tracking-widest">Pontos de Vida</span>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button onClick={() => apply(hp - 1)}
              className="w-5 h-5 flex items-center justify-center rounded text-saga-dim hover:text-red-400 hover:bg-red-400/10 transition-all">
              <Minus size={9} />
            </button>
          )}
          {canEdit && editing ? (
            <input
              type="number" value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitInput}
              onKeyDown={e => { if (e.key === 'Enter') commitInput(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              className="w-10 text-center font-cinzel font-bold text-base bg-transparent border-b outline-none"
              style={{ color, borderColor: 'rgba(255,255,255,0.2)' }}
            />
          ) : (
            <span
              className={`font-cinzel font-bold text-base leading-none ${canEdit ? 'cursor-pointer hover:opacity-70' : ''}`}
              style={{ color }}
              onClick={() => { if (!canEdit) return; setInputVal(String(hp)); setEditing(true) }}
              title={canEdit ? 'Clique para editar' : undefined}
            >
              {hp}
            </span>
          )}
          <span className="text-saga-dim font-normal text-[11px]"> / {maxHp}</span>
          {canEdit && (
            <button onClick={() => apply(hp + 1)}
              className="w-5 h-5 flex items-center justify-center rounded text-saga-dim hover:text-green-400 hover:bg-green-400/10 transition-all">
              <Plus size={9} />
            </button>
          )}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55` }} />
      </div>
      {saving && <p className="text-[9px] text-saga-dim mt-1 opacity-50 text-right">Salvando...</p>}
    </div>
  )
}

function AttributesBlock({ attributes }: { attributes: CharAttr[] }) {
  const coreAttrs  = attributes.filter(a => CORE_NAMES.has(a.name))
  const otherAttrs = attributes.filter(a => !CORE_NAMES.has(a.name))
  const hasCore    = coreAttrs.length >= 4

  return (
    <>
      {hasCore && (
        <div>
          <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2">Atributos</p>
          <div className="grid grid-cols-3 gap-2">
            {coreAttrs.map(a => (
              <div key={a.id} className="rounded-lg p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-cinzel text-xl font-bold text-saga-text leading-none">{dndMod(a.value)}</p>
                <div className="w-full h-px my-1.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <p className="text-[12px] font-semibold text-saga-muted leading-none mb-0.5">{a.value}</p>
                <p className="text-[8px] text-saga-dim uppercase tracking-widest font-bold">
                  {ATTR_ABBREV[a.name] ?? a.name.slice(0, 3).toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherAttrs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2">
            {hasCore ? 'Outras habilidades' : 'Atributos'}
          </p>
          <div className="space-y-1">
            {otherAttrs.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[12px] text-saga-muted">{a.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-cinzel font-bold text-sm text-saga-text">{a.value}</span>
                  {a.defaultDie && a.defaultDie !== 'd20' && (
                    <span className="text-[9px] text-saga-dim font-mono opacity-60">{a.defaultDie}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attributes.length === 0 && (
        <p className="text-sm text-saga-dim text-center py-6">Nenhum atributo registrado.</p>
      )}
    </>
  )
}

function NotesBlock({ charId, canEdit }: { charId: string; canEdit: boolean }) {
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/characters/${charId}/full`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { textFields?: { key: string; value: string }[] } | null) => {
        if (cancelled || !data) return
        const note = data.textFields?.find((f: { key: string; value: string }) => f.key === 'mesa_notes')
        setNotes(note?.value ?? '')
        setLoaded(true)
      })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [charId])

  async function saveNotes() {
    if (!canEdit) return
    setSaving(true)
    await fetch(`/api/characters/${charId}/text-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'mesa_notes', label: 'Notas da Sessão', value: notes, order: 99 }),
    }).catch(() => null)
    setSaving(false)
  }

  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <StickyNote size={11} className="text-saga-dim" />
          <span className="text-[10px] font-bold text-saga-dim uppercase tracking-widest">Notas da Sessão</span>
        </div>
        {saving && <span className="text-[9px] text-saga-dim opacity-50">Salvando...</span>}
      </div>
      {canEdit ? (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          placeholder={loaded ? 'Anotações rápidas da sessão...' : 'Carregando...'}
          disabled={!loaded}
          rows={4}
          className="w-full bg-transparent text-[12px] text-saga-text placeholder:text-saga-dim/50 focus:outline-none resize-none leading-relaxed"
        />
      ) : (
        <p className="text-[12px] text-saga-muted leading-relaxed whitespace-pre-wrap min-h-[40px]">
          {notes || <span className="italic text-saga-dim/50">Sem notas.</span>}
        </p>
      )}
    </div>
  )
}

type Selection =
  | { kind: 'member'; id: string }
  | { kind: 'npc';    id: string }

export function CharacterSheetPanel({ onClose, members, npcs, currentMemberId, isGM, campaignId, systemName, hpOverrides = {}, onHpChange }: Props) {
  const membersWithChar = members.filter(m => m.character)

  const [selection, setSelection] = useState<Selection>(() => {
    const mine = members.find(m => m.id === currentMemberId)
    if (mine?.character) return { kind: 'member', id: mine.id }
    const first = membersWithChar[0]
    if (first) return { kind: 'member', id: first.id }
    if (npcs[0]) return { kind: 'npc', id: npcs[0].id }
    return { kind: 'member', id: '' }
  })

  const [viewMode, setViewMode] = useState<'summary' | 'full'>('summary')
  const [fullData, setFullData] = useState<FullCharData | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)

  const selectedMember = selection.kind === 'member' ? members.find(m => m.id === selection.id) : null
  const selectedNpc    = selection.kind === 'npc'    ? npcs.find(n => n.id === selection.id)   : null

  const char    = selectedMember?.character ?? null
  const ClassIcon = CLASS_ICONS[char?.class ?? ''] ?? User

  const showPicker = isGM && (membersWithChar.length + npcs.length) > 1

  async function openFullSheet(charId: string) {
    setLoadingFull(true)
    setViewMode('full')
    const res = await fetch(`/api/characters/${charId}/full`).catch(() => null)
    const data = res?.ok ? (await res.json() as FullCharData) : null
    setFullData(data)
    setLoadingFull(false)
  }

  const refreshFull = useCallback(async () => {
    if (!char) return
    const res = await fetch(`/api/characters/${char.id}/full`).catch(() => null)
    const data = res?.ok ? (await res.json() as FullCharData) : null
    setFullData(data)
  }, [char])

  function switchSelection(sel: Selection) {
    setSelection(sel)
    setViewMode('summary')
    setFullData(null)
  }

  const isFullMode = viewMode === 'full'
  const panelWidth = isFullMode ? 740 : 370

  return (
    <>
      {/* Invisible backdrop */}
      <div className="absolute inset-0 z-40" onClick={onClose}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()} />

      {/* Panel */}
      <div className="absolute left-0 inset-y-0 z-50 flex flex-col overflow-hidden transition-all duration-300"
        style={{
          width: panelWidth,
          background: 'rgba(8,8,18,0.98)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(20px)',
          boxShadow: '6px 0 40px rgba(0,0,0,0.7)',
        }}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 py-3 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFullMode && (
              <button onClick={() => { setViewMode('summary'); setFullData(null) }}
                className="w-6 h-6 flex items-center justify-center rounded text-saga-dim hover:text-saga-text hover:bg-white/8 transition-all mr-1">
                <ArrowLeft size={13} />
              </button>
            )}
            <ClipboardList size={14} className="text-saga-dim" />
            <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">
              {isFullMode ? 'Ficha Completa' : 'Fichas de Personagem'}
            </span>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-saga-dim hover:text-saga-text hover:bg-white/8 transition-all">
            <X size={13} />
          </button>
        </div>

        {/* Picker — jogadores + NPCs (hidden in full mode) */}
        {!isFullMode && showPicker && (
          <div className="px-3 pt-2.5 pb-2 shrink-0 space-y-3 max-h-52 overflow-y-auto">
            {membersWithChar.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-saga-dim uppercase tracking-widest mb-1.5">Jogadores</p>
                <div className="flex gap-1.5 flex-wrap">
                  {membersWithChar.map(m => {
                    const isSel  = selection.kind === 'member' && selection.id === m.id
                    const isMine = m.id === currentMemberId
                    const initial = (m.character?.name ?? m.user.username)[0]?.toUpperCase() ?? '?'
                    return (
                      <button key={m.id} onClick={() => switchSelection({ kind: 'member', id: m.id })}
                        title={m.character?.name ?? m.user.username}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all"
                        style={{
                          background: isSel ? 'rgba(201,162,42,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSel ? 'rgba(201,162,42,0.45)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ background: isSel ? '#c9a22a' : '#7c3aed' }}>
                          {initial}
                        </div>
                        <span className={`text-[10px] font-medium max-w-[90px] truncate ${isSel ? 'text-gold' : 'text-saga-muted'}`}>
                          {m.character?.name ?? m.user.username}
                          {isMine ? ' (eu)' : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {isGM && npcs.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-saga-dim uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Skull size={9} className="opacity-60" />NPCs
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {npcs.map(n => {
                    const isSel  = selection.kind === 'npc' && selection.id === n.id
                    const color  = NPC_TYPE_COLOR[n.type] ?? '#c9a22a'
                    const initial = n.name[0]?.toUpperCase() ?? '?'
                    return (
                      <button key={n.id} onClick={() => switchSelection({ kind: 'npc', id: n.id })}
                        title={n.name}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all"
                        style={{
                          background: isSel ? `${color}18` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSel ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ background: isSel ? color : 'rgba(255,255,255,0.15)' }}>
                          {initial}
                        </div>
                        <span className="text-[10px] font-medium max-w-[90px] truncate"
                          style={{ color: isSel ? color : '#7878a0' }}>
                          {n.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Character — FULL SHEET mode ── */}
          {selection.kind === 'member' && isFullMode && (
            !char ? null : (
              loadingFull || !fullData ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <Loader2 size={24} className="text-saga-dim animate-spin" />
                  <p className="text-[12px] text-saga-dim">Carregando ficha...</p>
                </div>
              ) : (
                <div className="p-4">
                  <CharacterSheetView
                    characterId={char.id}
                    characterLevel={fullData.level}
                    attributes={fullData.attributes}
                    textFields={fullData.textFields}
                    weapons={fullData.weapons}
                    spellSlots={fullData.spellSlots}
                    canEdit={fullData.canEdit}
                    category={detectCategory(fullData.systemName)}
                    systemName={fullData.systemName}
                    onRefresh={refreshFull}
                  />
                </div>
              )
            )
          )}

          {/* ── Character — SUMMARY mode ── */}
          {selection.kind === 'member' && !isFullMode && (
            !char ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <ClipboardList size={40} className="opacity-20 text-saga-muted" />
                <p className="text-sm text-saga-dim text-center px-4">
                  {selectedMember
                    ? `${selectedMember.user.username} não tem personagem.`
                    : 'Nenhum personagem disponível.'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Identity */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white/40 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1a0533, #4a1080)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 4px 16px rgba(124,58,237,0.2)' }}>
                    <ClassIcon size={32} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h2 className="font-cinzel font-bold text-base text-saga-text truncate leading-tight">{char.name}</h2>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                      {char.class && <span className="text-[11px] text-saga-muted">{char.class}</span>}
                      {char.race && <span className="text-[11px] text-saga-dim">· {char.race}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(201,162,42,0.12)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.3)' }}>
                        Nível {char.level}
                      </span>
                      {systemName && <span className="text-[10px] text-saga-dim">{systemName}</span>}
                    </div>
                  </div>
                </div>

                <HPEditor
                  key={char.id}
                  initialHp={hpOverrides[char.id] ?? char.hp}
                  maxHp={char.maxHp}
                  canEdit={isGM || selectedMember?.id === currentMemberId}
                  onSave={hp => {
                    onHpChange?.(char.id, hp)
                    fetch(`/api/characters/${char.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hp }),
                    }).catch(() => {})
                  }}
                />

                <NotesBlock
                  key={`notes-${char.id}`}
                  charId={char.id}
                  canEdit={isGM || selectedMember?.id === currentMemberId}
                />

                <AttributesBlock attributes={char.attributes} />

                {/* Full sheet button */}
                <button
                  onClick={() => void openFullSheet(char.id)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded text-[11px] font-medium transition-colors"
                  style={{ background: 'rgba(201,162,42,0.08)', border: '1px solid rgba(201,162,42,0.25)', color: '#c9a22a' }}>
                  <FileText size={12} />
                  <span>Editar Ficha Completa</span>
                  <ChevronRight size={11} />
                </button>
              </div>
            )
          )}

          {/* ── NPC view ── */}
          {selection.kind === 'npc' && (
            !selectedNpc ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Skull size={40} className="opacity-20 text-saga-muted" />
                <p className="text-sm text-saga-dim text-center px-4">NPC não encontrado.</p>
              </div>
            ) : (() => {
              const typeColor = NPC_TYPE_COLOR[selectedNpc.type] ?? '#c9a22a'
              const typeLabel = NPC_TYPE_LABEL[selectedNpc.type] ?? selectedNpc.type
              return (
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white/40 shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1a0520, #3d1060)', border: `1px solid ${typeColor}35`, boxShadow: `0 4px 16px ${typeColor}20` }}>
                      <Skull size={28} style={{ color: typeColor, opacity: 0.7 }} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className="font-cinzel font-bold text-base text-saga-text truncate leading-tight">{selectedNpc.name}</h2>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {selectedNpc.class && <span className="text-[11px] text-saga-muted">{selectedNpc.class}</span>}
                        {selectedNpc.race && <span className="text-[11px] text-saga-dim">· {selectedNpc.race}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${typeColor}12`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                          {typeLabel}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(201,162,42,0.08)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.2)' }}>
                          Nível {selectedNpc.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <HPEditor
                    key={selectedNpc.id}
                    initialHp={hpOverrides[selectedNpc.id] ?? selectedNpc.hp}
                    maxHp={selectedNpc.maxHp}
                    canEdit={isGM}
                    onSave={hp => {
                      onHpChange?.(selectedNpc.id, hp)
                      fetch(`/api/campaigns/${campaignId}/npcs/${selectedNpc.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ hp }),
                      }).catch(() => {})
                    }}
                  />
                  <AttributesBlock attributes={selectedNpc.attributes} />

                  <a href={`/campaign/${campaignId}/npcs`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded text-[11px] font-medium text-saga-muted hover:text-gold transition-colors mt-1"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <FileText size={12} />
                    <span>Gerenciar NPCs</span>
                    <ChevronRight size={11} />
                  </a>
                </div>
              )
            })()
          )}
        </div>
      </div>
    </>
  )
}
