'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Trash2, Plus, X, Check, Loader2,
  Swords, Moon, Skull, Rocket, Dice6, Flame, Globe, Sparkles,
  Eye, Shield, Cpu, BookOpen, Lock, Users,
} from 'lucide-react'

interface SystemAttr {
  id: string; name: string; defaultDie: string; description: string | null
}
interface RPGSystem {
  id: string; name: string; description: string | null; imageUrl: string | null
  category: string; isPreset: boolean; createdAt: Date | string
  creator: { username: string; discordId: string } | null
  attributes: SystemAttr[]
}

interface Props {
  system: RPGSystem
  currentUserDiscordId: string
}

const CATEGORY_META: Record<string, { label: string; Icon: React.ElementType; gradient: string; textColor: string }> = {
  fantasy: { label: 'Fantasia', Icon: Swords, gradient: 'from-amber-900 via-yellow-900/60 to-transparent', textColor: 'text-amber-400' },
  'world-of-darkness': { label: 'Mundo das Trevas', Icon: Moon, gradient: 'from-purple-950 via-purple-900/50 to-transparent', textColor: 'text-purple-400' },
  horror: { label: 'Horror', Icon: Skull, gradient: 'from-red-950 via-red-900/40 to-transparent', textColor: 'text-red-400' },
  scifi: { label: 'Sci-Fi', Icon: Rocket, gradient: 'from-blue-950 via-blue-800/40 to-transparent', textColor: 'text-blue-400' },
  generic: { label: 'Genérico', Icon: Dice6, gradient: 'from-slate-800 via-slate-700/40 to-transparent', textColor: 'text-slate-400' },
  custom: { label: 'Personalizado', Icon: Pencil, gradient: 'from-violet-950 via-violet-800/30 to-transparent', textColor: 'text-violet-400' },
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

const CATEGORIES = [
  { id: 'fantasy', label: 'Fantasia' }, { id: 'world-of-darkness', label: 'Mundo das Trevas' },
  { id: 'horror', label: 'Horror' }, { id: 'scifi', label: 'Sci-Fi' },
  { id: 'generic', label: 'Genérico' }, { id: 'custom', label: 'Personalizado' },
]

// ─── Inline edit field ────────────────────────────────────────────────────────

function InlineEdit({ value, onSave, placeholder, multiline = false, className = '' }: {
  value: string; onSave: (v: string) => Promise<void>; placeholder: string
  multiline?: boolean; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (draft === value) { setEditing(false); return }
    setLoading(true)
    await onSave(draft)
    setLoading(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        className={`cursor-pointer group/edit inline-flex items-start gap-1 ${className}`}
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        {value || <span className="text-ink-soft italic">{placeholder}</span>}
        <Pencil size={11} className="opacity-0 group-hover/edit:opacity-40 mt-1 shrink-0" />
      </span>
    )
  }

  return (
    <span className={`inline-flex items-start gap-1 ${className}`}>
      {multiline ? (
        <textarea
          autoFocus rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="flex-1 px-2 py-1 rounded text-sm border resize-none"
          style={{ background: '#0d0d18', borderColor: 'rgba(51,41,29,0.18)', color: 'inherit', outline: 'none', minWidth: 200 }}
        />
      ) : (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="flex-1 px-2 py-1 rounded text-sm border"
          style={{ background: '#0d0d18', borderColor: 'rgba(51,41,29,0.18)', color: 'inherit', outline: 'none', minWidth: 160 }}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        />
      )}
      <button onClick={save} disabled={loading} className="text-gold hover:text-gold/80 transition-colors mt-1">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={() => setEditing(false)} className="text-ink-soft hover:text-ink transition-colors mt-1">
        <X size={13} />
      </button>
    </span>
  )
}

// ─── Add attribute row ────────────────────────────────────────────────────────

function AddAttrRow({ systemId, onAdded }: { systemId: string; onAdded: (a: SystemAttr) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [die, setDie] = useState('d20')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true); setError('')
    const res = await fetch(`/api/systems/${systemId}/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), defaultDie: die }),
    })
    setLoading(false)
    if (!res.ok) { setError('Erro ao adicionar.'); return }
    const attr = await res.json() as SystemAttr
    onAdded(attr)
    setName(''); setDie('d20'); setOpen(false)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-[11px] text-ink-soft hover:text-gold transition-colors py-1"
    >
      <Plus size={12} /> Adicionar atributo
    </button>
  )

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome do atributo"
        className="flex-1 px-2 py-1 rounded text-xs border"
        style={{ background: '#0d0d18', borderColor: 'rgba(51,41,29,0.15)', color: 'inherit', outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
      />
      <input
        value={die}
        onChange={e => setDie(e.target.value)}
        placeholder="d20"
        className="w-16 px-2 py-1 rounded text-xs border"
        style={{ background: '#0d0d18', borderColor: 'rgba(51,41,29,0.15)', color: 'inherit', outline: 'none' }}
      />
      <button onClick={submit} disabled={loading} className="text-gold hover:text-gold/70 transition-colors">
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={() => setOpen(false)} className="text-ink-soft hover:text-ink transition-colors">
        <X size={13} />
      </button>
      {error && <span className="text-red-700 text-[10px]">{error}</span>}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SystemDetailView({ system: initial, currentUserDiscordId }: Props) {
  const router = useRouter()
  const [system, setSystem] = useState(initial)
  const isMine = !system.isPreset && system.creator?.discordId === currentUserDiscordId

  const meta = CATEGORY_META[system.category] ?? CATEGORY_META.custom!
  const CatIcon = meta.Icon
  const SysIcon = SYSTEM_ICONS[system.name] ?? CatIcon

  async function patch(data: Record<string, string | null>) {
    const res = await fetch(`/api/systems/${system.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json() as RPGSystem
      setSystem(updated)
    }
  }

  async function handleDelete() {
    if (!confirm(`Deletar "${system.name}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/systems/${system.id}`, { method: 'DELETE' }).catch(() => null)
    router.push('/systems')
  }

  async function handleDeleteAttr(attrId: string) {
    await fetch(`/api/systems/${system.id}/attributes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributeId: attrId }),
    }).catch(() => null)
    setSystem(prev => ({ ...prev, attributes: prev.attributes.filter(a => a.id !== attrId) }))
  }

  return (
    <div className="p-4 sm:p-8 sm:pt-6 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.push('/systems')}
        className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={13} /> Sistemas
      </button>

      {/* Hero banner */}
      <div className={`relative rounded-xl overflow-hidden h-36 mb-6 bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}
           style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to, transparent))` }}>
        {system.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={system.imageUrl} alt={system.name} className="w-full h-full object-cover opacity-60 absolute inset-0" />
        ) : (
          <SysIcon size={56} className="text-white/15" />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${meta.textColor} bg-black/30 border-current/30`}>
            <CatIcon size={8} /> {meta.label}
          </span>
          {system.isPreset ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-gold/10 text-gold border-gold/30">
              <Lock size={7} /> Oficial
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-ink/5 text-ink-soft border-ink/15">
              <Users size={7} /> Comunidade
            </span>
          )}
        </div>
        {isMine && (
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button
              onClick={handleDelete}
              className="p-1.5 rounded bg-black/40 text-red-700/60 hover:text-red-700 border border-saga-danger/20 hover:border-saga-danger/40 transition-all"
              title="Deletar sistema"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Name + description */}
      <div className="mb-6">
        <h1 className="font-cinzel-deco text-2xl font-bold mb-2">
          {isMine ? (
            <InlineEdit
              value={system.name}
              placeholder="Nome do sistema"
              onSave={v => patch({ name: v })}
            />
          ) : system.name}
        </h1>

        <div className="text-sm text-ink-soft leading-relaxed">
          {isMine ? (
            <InlineEdit
              value={system.description ?? ''}
              placeholder="Adicionar descrição..."
              multiline
              onSave={v => patch({ description: v || null })}
              className="block w-full"
            />
          ) : (
            system.description ?? <span className="italic text-ink-soft">Sem descrição.</span>
          )}
        </div>

        {isMine && (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">Categoria</p>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => patch({ category: c.id })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    system.category === c.id
                      ? 'bg-gold/12 border-gold/35 text-gold'
                      : 'border-ink/20 text-ink-soft hover:border-wax hover:text-ink'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isMine && (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1">URL da capa</p>
            <InlineEdit
              value={system.imageUrl ?? ''}
              placeholder="https://..."
              onSave={v => patch({ imageUrl: v || null })}
              className="text-xs text-ink-soft"
            />
          </div>
        )}
      </div>

      {/* Attributes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
            Atributos
          </p>
          <span className="text-[10px] text-ink-soft/50">{system.attributes.length}</span>
        </div>

        {system.attributes.length === 0 ? (
          <p className="text-xs text-ink-soft italic mb-3">Nenhum atributo definido.</p>
        ) : (
          <div className="space-y-1 mb-3">
            {system.attributes.map(attr => (
              <div
                key={attr.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg group/attr"
                style={{ background: 'rgba(51,41,29,0.03)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium truncate">{attr.name}</span>
                  {attr.description && (
                    <span className="text-[10px] text-ink-soft/60 truncate hidden sm:block">
                      {attr.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-ink-soft font-mono">{attr.defaultDie}</span>
                  {isMine && (
                    <button
                      onClick={() => handleDeleteAttr(attr.id)}
                      className="opacity-0 group-hover/attr:opacity-100 text-ink-soft hover:text-red-700 transition-all"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isMine && (
          <AddAttrRow
            systemId={system.id}
            onAdded={attr => setSystem(prev => ({ ...prev, attributes: [...prev.attributes, attr] }))}
          />
        )}
      </div>

      {!isMine && system.creator && (
        <p className="mt-8 text-[10px] text-ink-soft/50">
          Criado por {system.creator.username}
        </p>
      )}
    </div>
  )
}
