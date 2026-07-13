'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Trash2, Shield, User, ShieldAlert, UserCheck, Heart, Wind } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { NPCHPEditor } from './NPCHPEditor'
import { safeImageUrl } from '@/lib/safe-url'
import { coverFor } from '@/lib/campaign-cover'

const NPC_TYPES = [
  { value: 'NEUTRAL', label: 'Neutro' },
  { value: 'ALLY', label: 'Aliado' },
  { value: 'VILLAIN', label: 'Vilão' },
  { value: 'MERCHANT', label: 'Mercador' },
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'MOUNT', label: 'Montaria' },
  { value: 'SERVANT', label: 'Servo' },
  { value: 'OTHER', label: 'Outro' },
]

const NPC_TYPE_ICONS: Record<string, React.ElementType> = {
  VILLAIN: ShieldAlert, ALLY: UserCheck, FAMILIAR: Heart, MOUNT: Wind,
}

interface Player { id: string; user: { username: string } }

interface NPCData {
  id: string
  name: string
  race: string | null
  class: string | null
  level: number
  description: string | null
  imageUrl: string | null
  type: string
  isPublic: boolean
  linkedMemberId: string | null
  hp: number
  maxHp: number
}

const INPUT = 'bg-parchment/60 border border-gold/40 rounded px-2 py-1 focus:outline-none text-sm'

export function NPCInfoEditor({ campaignId, npc: initial, players }: {
  campaignId: string
  npc: NPCData
  players: Player[]
}) {
  const router = useRouter()
  const [npc, setNpc] = useState(initial)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)
  const [imgDraft, setImgDraft] = useState('')

  const TypeIcon = NPC_TYPE_ICONS[npc.type] ?? User

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => null)
    if (res?.ok) {
      const updated = await res.json() as Record<string, unknown>
      setNpc(n => ({ ...n, ...updated } as NPCData))
      router.refresh()
    }
  }

  // Nível: atualização otimista (instantânea) + PATCH debounced em segundo plano,
  // sem router.refresh — clicar em +/- não espera o servidor.
  const levelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const levelTarget = useRef(initial.level)
  function changeLevel(delta: number) {
    const level = Math.max(1, Math.min(100, levelTarget.current + delta))
    if (level === levelTarget.current) return
    levelTarget.current = level
    setNpc(n => ({ ...n, level }))
    if (levelTimer.current) clearTimeout(levelTimer.current)
    levelTimer.current = setTimeout(() => {
      fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      }).catch(() => {})
    }, 350)
  }

  function startEdit(field: string, value: string) {
    setEditingField(field)
    setDraft(value)
  }

  async function commitEdit(field: string) {
    setEditingField(null)
    const trimmed = draft.trim()
    const current = String((npc as unknown as Record<string, unknown>)[field] ?? '')
    if (trimmed === current) return
    await patch({ [field]: trimmed || null })
  }

  function onKey(e: React.KeyboardEvent, field: string, multiline = false) {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); void commitEdit(field) }
    if (e.key === 'Escape') setEditingField(null)
  }

  async function handleDelete() {
    setDeleteLoading(true)
    await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, { method: 'DELETE' }).catch(() => null)
    router.push(`/campaign/${campaignId}/npcs`)
  }

  const imgSafe = safeImageUrl(npc.imageUrl)

  return (
    <div className="space-y-4">
      {/* Portrait card */}
      <div className="bg-card border border-ink/20 rounded-lg overflow-hidden">
        <div className="relative group">
          {imgSafe ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSafe} alt={npc.name} className="w-full h-52 object-cover object-top" />
          ) : (
            <div className={`w-full h-52 bg-gradient-to-br ${coverFor(1)} flex items-center justify-center`}>
              <TypeIcon size={72} className="text-white/30" />
            </div>
          )}
          <button
            onClick={() => { setImgDraft(npc.imageUrl ?? ''); setImgOpen(true) }}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-sm"
          >
            <Camera size={16} />
            Alterar imagem
          </button>
        </div>

        <div className="p-4 space-y-2">
          {/* Name */}
          {editingField === 'name' ? (
            <input
              autoFocus value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => void commitEdit('name')}
              onKeyDown={e => onKey(e, 'name')}
              className={`w-full font-cinzel-deco text-sm font-bold text-center ${INPUT}`}
            />
          ) : (
            <h2
              onClick={() => startEdit('name', npc.name)}
              title="Clique para editar"
              className="font-cinzel-deco text-base font-bold text-center leading-snug cursor-pointer hover:text-gold transition-colors"
            >
              {npc.name}
            </h2>
          )}

          {/* Race */}
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-ink-soft">Raça</span>
            {editingField === 'race' ? (
              <input
                autoFocus value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={() => void commitEdit('race')}
                onKeyDown={e => onKey(e, 'race')}
                className={`text-right w-28 ${INPUT}`}
              />
            ) : (
              <span
                onClick={() => startEdit('race', npc.race ?? '')}
                title="Clique para editar"
                className="font-fell cursor-pointer hover:text-gold transition-colors"
              >
                {npc.race ?? <span className="text-ink-soft italic">—</span>}
              </span>
            )}
          </div>

          {/* Class */}
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-ink-soft">Classe</span>
            {editingField === 'class' ? (
              <input
                autoFocus value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={() => void commitEdit('class')}
                onKeyDown={e => onKey(e, 'class')}
                className={`text-right w-28 ${INPUT}`}
              />
            ) : (
              <span
                onClick={() => startEdit('class', npc.class ?? '')}
                title="Clique para editar"
                className="font-fell cursor-pointer hover:text-gold transition-colors"
              >
                {npc.class ?? <span className="text-ink-soft italic">—</span>}
              </span>
            )}
          </div>

          {/* Level */}
          <div className="flex justify-center items-center gap-2 mt-3">
            <button
              onClick={() => changeLevel(-1)}
              className="w-6 h-6 text-ink-soft hover:text-gold transition-colors text-xl leading-none flex items-center justify-center"
            >−</button>
            <Badge variant="gold">Nível {npc.level}</Badge>
            <button
              onClick={() => changeLevel(1)}
              className="w-6 h-6 text-ink-soft hover:text-gold transition-colors text-xl leading-none flex items-center justify-center"
            >+</button>
          </div>

          {/* Linked member */}
          <div className="border-t border-ink/20 pt-2 mt-2">
            <p className="text-[10px] text-ink-soft mb-1">Ligado ao jogador</p>
            <Select
              size="sm"
              value={npc.linkedMemberId ?? ''}
              onChange={v => void patch({ linkedMemberId: v || null })}
              options={[{ value: '', label: 'Nenhum' }, ...players.map(p => ({ value: p.id, label: p.user.username }))]}
            />
          </div>
        </div>
      </div>

      {/* HP */}
      <NPCHPEditor campaignId={campaignId} npcId={npc.id} hp={npc.hp} maxHp={npc.maxHp} />

      {/* Type */}
      <div className="bg-card border border-ink/20 rounded-lg p-3">
        <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-2">Tipo de NPC</p>
        <Select
          value={npc.type}
          onChange={v => void patch({ type: v })}
          options={NPC_TYPES.map(t => ({ value: t.value, label: t.label }))}
        />
      </div>

      {/* Visibility */}
      <div className="bg-card border border-ink/20 rounded-lg p-3">
        <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-2">Visibilidade</p>
        <button
          onClick={() => void patch({ isPublic: !npc.isPublic })}
          className="flex items-center gap-3 w-full text-left"
        >
          <div className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${npc.isPublic ? 'bg-saga-success' : 'bg-border-bright'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${npc.isPublic ? 'right-[3px]' : 'left-[3px]'}`} />
          </div>
          <span className="text-sm">{npc.isPublic ? 'Visível a todos' : 'Restrito ao Mestre'}</span>
        </button>
      </div>

      {/* Description */}
      <div className="bg-card border border-ink/20 rounded-lg p-4">
        <p className="font-almendra text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-2 flex items-center gap-1">
          <Shield size={9} /> Descrição
        </p>
        {editingField === 'description' ? (
          <textarea
            autoFocus value={draft} rows={4}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => void commitEdit('description')}
            onKeyDown={e => onKey(e, 'description', true)}
            className={`w-full resize-none ${INPUT}`}
          />
        ) : (
          <p
            onClick={() => startEdit('description', npc.description ?? '')}
            title="Clique para editar"
            className="text-sm text-ink-soft leading-relaxed cursor-pointer hover:text-ink transition-colors min-h-[1.5rem]"
          >
            {npc.description ?? <span className="text-ink-soft italic">Clique para adicionar descrição...</span>}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => setDeleteOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm text-red-700 border border-saga-danger/30 hover:bg-saga-danger/10 transition-colors"
      >
        <Trash2 size={13} />
        Deletar NPC
      </button>

      {/* Image URL mini-modal */}
      {imgOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setImgOpen(false)}
        >
          <div
            className="bg-card border border-ink/20 rounded-lg p-5 w-80 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-cinzel text-sm font-semibold mb-3">URL da Imagem</p>
            <input
              autoFocus value={imgDraft}
              onChange={e => setImgDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { void patch({ imageUrl: imgDraft.trim() || null }); setImgOpen(false) }
                if (e.key === 'Escape') setImgOpen(false)
              }}
              placeholder="https://..."
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setImgOpen(false)} className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => { void patch({ imageUrl: imgDraft.trim() || null }); setImgOpen(false) }}
                className="px-3 py-1.5 text-sm bg-gold text-black font-semibold rounded hover:bg-gold/90 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteOpen}
        variant="danger"
        title={`Deletar "${npc.name}"?`}
        description="Esta ação não pode ser desfeita. O NPC e todos os seus atributos serão removidos permanentemente."
        confirmLabel={deleteLoading ? 'Deletando…' : 'Deletar'}
        cancelLabel="Cancelar"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
