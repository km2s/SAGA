'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Swords, Moon, Skull, Rocket, Dice6, Pencil,
  Flame, Globe, Sparkles, Eye, Shield, Cpu, BookOpen,
  Plus, Users, Lock, ChevronRight,
} from 'lucide-react'
import { CreateSystemModal } from './CreateSystemModal'

interface SystemAttr { id: string; name: string; defaultDie: string; description: string | null }
interface RPGSystem {
  id: string; name: string; description: string | null; imageUrl: string | null
  category: string; isPreset: boolean; createdAt: Date | string
  creator: { username: string; discordId: string } | null
  attributes: SystemAttr[]
}

interface Props {
  systems: RPGSystem[]
  currentUserDiscordId: string
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, {
  label: string; Icon: React.ElementType
  gradient: string; textColor: string; badgeClass: string
}> = {
  fantasy: {
    label: 'Fantasia', Icon: Swords,
    gradient: 'from-amber-900 via-yellow-900/70 to-[#0d0d18]',
    textColor: 'text-amber-400',
    badgeClass: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  },
  'world-of-darkness': {
    label: 'Mundo das Trevas', Icon: Moon,
    gradient: 'from-purple-950 via-purple-900/60 to-[#0d0d18]',
    textColor: 'text-purple-400',
    badgeClass: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  },
  horror: {
    label: 'Horror', Icon: Skull,
    gradient: 'from-red-950 via-red-900/50 to-[#0d0d18]',
    textColor: 'text-red-400',
    badgeClass: 'bg-red-400/10 text-red-400 border-red-400/30',
  },
  scifi: {
    label: 'Sci-Fi', Icon: Rocket,
    gradient: 'from-blue-950 via-blue-800/50 to-[#0d0d18]',
    textColor: 'text-blue-400',
    badgeClass: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  },
  generic: {
    label: 'Genérico', Icon: Dice6,
    gradient: 'from-slate-800 via-slate-700/50 to-[#0d0d18]',
    textColor: 'text-slate-400',
    badgeClass: 'bg-slate-400/10 text-slate-400 border-slate-400/30',
  },
  custom: {
    label: 'Personalizado', Icon: Pencil,
    gradient: 'from-violet-950 via-violet-800/40 to-[#0d0d18]',
    textColor: 'text-violet-400',
    badgeClass: 'bg-violet-400/10 text-violet-400 border-violet-400/30',
  },
}

const SYSTEM_ICONS: Record<string, React.ElementType> = {
  'D&D 5e': Swords, 'D&D 3.5e': Swords, 'Pathfinder 2e': Shield, 'Pathfinder 1e': Shield,
  'Tormenta20': Flame, 'Old Dragon 2': Flame, 'Dungeon World': Globe, '13th Age': Swords,
  'Vampire: The Masquerade V5': Moon, 'Vampire: The Masquerade V20': Moon,
  'Vampire: The Masquerade': Moon, 'Werewolf: The Apocalypse': Skull,
  'Mage: The Ascension': Sparkles, 'Mage: The Awakening': Sparkles,
  'Hunter: The Reckoning': Eye, 'Changeling: The Lost': Sparkles,
  'Demon: The Descent': Flame, 'Geist: The Sin-Eaters': Skull,
  'Call of Cthulhu 7e': Eye, 'Delta Green': Shield, 'Mothership': Rocket,
  'Cyberpunk Red': Cpu, 'Starfinder': Rocket, 'Shadowrun 6e': Cpu,
  'GURPS 4e': BookOpen, 'Fate Core': Dice6, 'Savage Worlds': Dice6,
}

const FILTERS = [
  { id: 'all',               label: 'Todos' },
  { id: 'fantasy',          label: 'Fantasia' },
  { id: 'world-of-darkness',label: 'Mundo das Trevas' },
  { id: 'horror',           label: 'Horror' },
  { id: 'scifi',            label: 'Sci-Fi' },
  { id: 'generic',          label: 'Genérico' },
  { id: 'community',        label: 'Comunidade' },
]

// ─── System Card ──────────────────────────────────────────────────────────────

function SystemCard({ system, isMine, onDelete }: {
  system: RPGSystem; isMine: boolean; onDelete: (id: string) => void
}) {
  const router = useRouter()
  const meta = CATEGORY_META[system.category] ?? CATEGORY_META.custom!
  const CatIcon = meta.Icon
  const SysIcon = SYSTEM_ICONS[system.name] ?? CatIcon

  return (
    <div
      className="parchment-card group rounded-xl overflow-hidden cursor-pointer card-hover"
      onClick={() => router.push(`/systems/${system.id}`)}
    >
      {/* Banner */}
      <div className={`relative h-28 bg-gradient-to-br ${meta.gradient} flex items-center justify-center overflow-hidden`}>
        {system.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={system.imageUrl} alt={system.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <SysIcon size={44} className="text-white/20" />
        )}
        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${meta.badgeClass}`}>
            <CatIcon size={8} />
            {meta.label}
          </span>
        </div>
        {/* Preset or community badge */}
        <div className="absolute top-2.5 right-2.5">
          {system.isPreset ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-gold/10 text-gold border-gold/30">
              <Lock size={7} /> Oficial
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-white/10 text-parchment/80 border-white/20">
              <Users size={7} /> Comunidade
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-cinzel text-sm font-bold leading-tight mb-1 group-hover:text-wax transition-colors">
          {system.name}
        </h3>
        {system.description ? (
          <p className="text-[11px] text-ink-soft leading-relaxed line-clamp-2 mb-3">
            {system.description}
          </p>
        ) : (
          <p className="text-[11px] text-ink-soft italic mb-3">Sem descrição.</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-ink-soft">
            <span>{system.attributes.length} atributos</span>
            {!system.isPreset && system.creator && (
              <span className="text-ink-soft/60">por {system.creator.username}</span>
            )}
          </div>
          <ChevronRight size={13} className="text-ink-soft group-hover:text-wax transition-colors" />
        </div>

        {isMine && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(system.id) }}
            className="mt-3 w-full text-[10px] text-wax/70 hover:text-wax border border-wax/25 hover:border-wax/50 rounded py-1.5 transition-all"
          >
            Deletar sistema
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function SystemsView({ systems: initial, currentUserDiscordId }: Props) {
  const router = useRouter()
  const [systems, setSystems] = useState(initial)
  const [filter, setFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = systems.filter(s => {
    if (filter === 'all') return true
    if (filter === 'community') return !s.isPreset
    return s.category === filter
  })

  async function handleDelete(id: string) {
    if (!confirm('Deletar este sistema? Esta ação não pode ser desfeita.')) return
    await fetch(`/api/systems/${id}`, { method: 'DELETE' }).catch(() => null)
    setSystems(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="p-4 sm:p-8 sm:pt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="flex items-center gap-2 font-cinzel text-[11px] tracking-[0.35em] text-wax uppercase"><BookOpen className="h-3.5 w-3.5" /> Códices</p>
          <h1 className="font-cinzel text-3xl font-bold text-ink">Sistemas de RPG</h1>
          <p className="text-sm text-ink-soft mt-1 font-cormorant italic">
            {systems.filter(s => s.isPreset).length} oficiais · {systems.filter(s => !s.isPreset).length} da comunidade
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-cinzel bg-wax text-parchment hover:bg-wax-deep shadow-sm transition-all"
        >
          <Plus size={14} />
          Criar Sistema
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-cinzel tracking-wide transition-all border ${
              filter === f.id
                ? 'bg-wax text-parchment border-wax-deep'
                : 'bg-parchment/50 border-ink/20 text-ink-soft hover:border-wax hover:text-wax'
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">
              {f.id === 'all' ? systems.length
                : f.id === 'community' ? systems.filter(s => !s.isPreset).length
                : systems.filter(s => s.category === f.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          <Dice6 size={32} className="mx-auto mb-3 opacity-40 text-wax" />
          <p className="text-sm font-cormorant">Nenhum sistema nesta categoria.</p>
          {filter === 'community' && (
            <button onClick={() => setCreateOpen(true)}
              className="mt-3 text-wax text-sm hover:underline">
              Criar o primeiro →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(system => (
            <SystemCard
              key={system.id}
              system={system}
              isMine={!system.isPreset && system.creator?.discordId === currentUserDiscordId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateSystemModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={system => {
          setSystems(prev => [...prev, system as RPGSystem])
          setCreateOpen(false)
          router.push(`/systems/${system.id}`)
        }}
      />
    </div>
  )
}
