'use client'

import { useState } from 'react'
import { Swords, Sparkles, Shield, Sword, Plus, Axe, Leaf, Music, Target, Dumbbell, Moon, ScrollText, User, ClipboardList, X, FileText, ChevronRight } from 'lucide-react'

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

interface MesaMember {
  id: string
  role: string
  user: { username: string }
  character: CharData | null
}

interface Props {
  onClose: () => void
  members: MesaMember[]
  currentMemberId: string
  isGM: boolean
  campaignId: string
  systemName: string | null
}

const CLASS_ICONS: Record<string, React.ElementType> = {
  Guerreiro: Swords, Mago: Sparkles, Paladino: Shield, Ladino: Sword, Clérigo: Plus,
  Bárbaro: Axe, Druida: Leaf, Bardo: Music, Ranger: Target, Monge: Dumbbell,
  Feiticeiro: Sparkles, Bruxo: Moon, Arcanista: ScrollText,
}

const CORE_NAMES = new Set(['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'])
const ATTR_ABBREV: Record<string, string> = {
  'Força': 'FOR', 'Destreza': 'DES', 'Constituição': 'CON',
  'Inteligência': 'INT', 'Sabedoria': 'SAB', 'Carisma': 'CAR',
}

function dndMod(v: number) {
  const m = Math.floor((v - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

export function CharacterSheetPanel({ onClose, members, currentMemberId, isGM, campaignId, systemName }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const mine = members.find(m => m.id === currentMemberId)
    if (mine?.character) return mine.id
    return members.find(m => m.character)?.id ?? null
  })

  const selected = members.find(m => m.id === selectedId)
  const char = selected?.character
  const ClassIcon = CLASS_ICONS[char?.class ?? ''] ?? User
  const membersWithChar = members.filter(m => m.character)

  const coreAttrs = char?.attributes.filter(a => CORE_NAMES.has(a.name)) ?? []
  const otherAttrs = char?.attributes.filter(a => !CORE_NAMES.has(a.name)) ?? []
  const hasCore = coreAttrs.length >= 4

  const hpPct = char && char.maxHp > 0 ? Math.min(100, Math.round((char.hp / char.maxHp) * 100)) : 0
  const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444'

  return (
    <>
      {/* Invisible backdrop that closes the panel */}
      <div
        className="absolute inset-0 z-40"
        onClick={onClose}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      />

      {/* Panel */}
      <div
        className="absolute left-0 inset-y-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 370,
          background: 'rgba(8,8,18,0.98)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(20px)',
          boxShadow: '6px 0 40px rgba(0,0,0,0.7)',
        }}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-saga-dim" />
            <span className="font-cinzel text-[11px] font-bold text-saga-muted uppercase tracking-widest">
              Fichas de Personagem
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-saga-dim hover:text-saga-text hover:bg-white/8 transition-all"
          >
            <X size={13} />
          </button>
        </div>

        {/* Member picker (GM always sees all; players see only their own) */}
        {(isGM && membersWithChar.length > 1) && (
          <div className="px-3 pt-2.5 pb-2 border-b border-white/6 shrink-0">
            <p className="text-[9px] font-bold text-saga-dim uppercase tracking-widest mb-1.5">Jogadores</p>
            <div className="flex gap-1.5 flex-wrap">
              {membersWithChar.map(m => {
                const isSel = m.id === selectedId
                const isMine = m.id === currentMemberId
                const initial = (m.character?.name ?? m.user.username)[0]?.toUpperCase() ?? '?'
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    title={m.character?.name ?? m.user.username}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all"
                    style={{
                      background: isSel ? 'rgba(201,162,42,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSel ? 'rgba(201,162,42,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!char ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <ClipboardList size={40} className="opacity-20 text-saga-muted" />
              <p className="text-sm text-saga-dim text-center px-4">
                {selected
                  ? `${selected.user.username} não tem personagem.`
                  : 'Nenhum personagem disponível.'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Identity header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-white/40 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1a0533, #4a1080)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.2)',
                  }}
                >
                  <ClassIcon size={32} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="font-cinzel font-bold text-base text-saga-text truncate leading-tight">
                    {char.name}
                  </h2>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {char.class && <span className="text-[11px] text-saga-muted">{char.class}</span>}
                    {char.race && (
                      <span className="text-[11px] text-saga-dim">· {char.race}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(201,162,42,0.12)',
                        color: '#c9a22a',
                        border: '1px solid rgba(201,162,42,0.3)',
                      }}
                    >
                      Nível {char.level}
                    </span>
                    {systemName && (
                      <span className="text-[10px] text-saga-dim">{systemName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* HP */}
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-saga-dim uppercase tracking-widest">Pontos de Vida</span>
                  <span className="font-cinzel font-bold text-base leading-none" style={{ color: hpColor }}>
                    {char.hp}
                    <span className="text-saga-dim font-normal text-[11px]"> / {char.maxHp}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${hpPct}%`,
                      background: hpColor,
                      boxShadow: `0 0 8px ${hpColor}55`,
                    }}
                  />
                </div>
              </div>

              {/* Core attributes (D&D-style 6-stat grid) */}
              {hasCore && (
                <div>
                  <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2">Atributos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {coreAttrs.map(a => (
                      <div
                        key={a.id}
                        className="rounded-lg p-2.5 text-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
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

              {/* Non-core / custom attributes */}
              {otherAttrs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-saga-dim uppercase tracking-widest mb-2">
                    {hasCore ? 'Outras habilidades' : 'Atributos'}
                  </p>
                  <div className="space-y-1">
                    {otherAttrs.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between px-3 py-2 rounded"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
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

              {char.attributes.length === 0 && (
                <p className="text-sm text-saga-dim text-center py-6">Nenhum atributo registrado.</p>
              )}

              {/* Link to full sheet */}
              <a
                href={`/characters/${selected?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded text-[11px] font-medium text-saga-muted hover:text-gold transition-colors mt-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <FileText size={12} />
                <span>Ver e editar ficha completa</span>
                <ChevronRight size={11} />
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
