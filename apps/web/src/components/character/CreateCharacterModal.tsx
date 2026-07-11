'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import {
  Swords, Moon, Skull, Rocket, Dice6, Pencil,
  Sword, Flame, Globe, Castle, Sparkles, Target, Leaf, Zap, Ghost, Eye, Shield, Cpu, Monitor, Compass,
  BookOpen, Star, Key, ShieldCheck,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  system: { id: string; name: string; category: string } | null
}

const SYSTEM_ICONS: Record<string, React.ElementType> = {
  'D&D 5e': Swords, 'D&D 3.5e': Swords, 'Pathfinder 2e': Sword, 'Pathfinder 1e': Sword,
  'Tormenta20': Flame, 'Old Dragon 2': Flame, 'Dungeon World': Globe, '13th Age': Castle,
  'Vampire: The Masquerade V5': Moon, 'Vampire: The Masquerade V20': Moon,
  'Werewolf: The Apocalypse': Skull, 'Mage: The Ascension': Sparkles,
  'Mage: The Awakening': Sparkles, 'Hunter: The Reckoning': Target,
  'Changeling: The Lost': Leaf, 'Demon: The Descent': Zap,
  'Geist: The Sin-Eaters': Ghost,
  'Call of Cthulhu 7e': Eye, 'Delta Green': Shield, 'Mothership': Rocket,
  'Cyberpunk Red': Cpu, 'Starfinder': Rocket, 'Shadowrun 6e': Monitor,
  'Star Wars: Edge of the Empire': Compass,
  'GURPS 4e': BookOpen, 'Fate Core': Star, 'Savage Worlds': Target,
  'Blades in the Dark': Key, 'Ironsworn': ShieldCheck,
  'Personalizado': Pencil,
}

const CATEGORY_COLOR: Record<string, string> = {
  'fantasy':           '#c9a22a',
  'world-of-darkness': '#9d5af5',
  'horror':            '#5a9e8f',
  'scifi':             '#5b8dd9',
  'generic':           '#7878a0',
  'custom':            '#7878a0',
}

export function CreateCharacterModal({ campaigns, open, onClose }: {
  campaigns: Campaign[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    campaignId: campaigns[0]?.id ?? '',
    name: '', race: '', class: '',
    level: '1', maxHp: '10', imageUrl: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // Derive system from the selected campaign
  const selectedCampaign = campaigns.find(c => c.id === form.campaignId) ?? campaigns[0] ?? null
  const system = selectedCampaign?.system ?? null
  const SystemIcon = SYSTEM_ICONS[system?.name ?? ''] ?? Dice6
  const systemColor = CATEGORY_COLOR[system?.category ?? 'custom'] ?? '#7878a0'

  function handleClose() {
    setError('')
    setForm({ campaignId: campaigns[0]?.id ?? '', name: '', race: '', class: '', level: '1', maxHp: '10', imageUrl: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    if (!form.campaignId) { setError('Selecione uma campanha'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: form.campaignId,
        name: form.name.trim(),
        race: form.race.trim() || null,
        class: form.class.trim() || null,
        level: parseInt(form.level) || 1,
        hp: parseInt(form.maxHp) || 10,
        maxHp: parseInt(form.maxHp) || 10,
        imageUrl: form.imageUrl.trim() || null,
        systemId: system?.id ?? null,
      }),
    }).catch(() => null)

    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao criar personagem')
      return
    }
    handleClose()
    router.refresh()
  }

  if (campaigns.length === 0) {
    return (
      <Modal open={open} onClose={handleClose} title="Criar Personagem">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Dice6 size={40} className="text-ink-soft opacity-40" />
          <p className="text-sm text-ink-soft">
            Você não está em nenhuma campanha como jogador, ou já tem um personagem em todas elas.
          </p>
          <Button variant="secondary" type="button" onClick={handleClose}>Fechar</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Criar Personagem">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Campanha — ao selecionar, sistema é derivado automaticamente */}
        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">
            Campanha *
          </label>
          {campaigns.length === 1 ? (
            // Uma única campanha — não precisa de dropdown
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink/15 bg-ink/[0.03]">
              <span className="text-sm text-ink font-medium">{selectedCampaign?.name}</span>
            </div>
          ) : (
            <Select value={form.campaignId} onChange={v => set('campaignId', v)}
              options={campaigns.map(c => ({ value: c.id, label: c.name }))} />
          )}
        </div>

        {/* Sistema derivado da campanha */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
          style={{ borderColor: `${systemColor}30`, background: `${systemColor}08` }}>
          <SystemIcon size={16} style={{ color: systemColor }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: systemColor }}>
              {system?.name ?? 'Personalizado'}
            </p>
            <p className="text-[10px] text-ink-soft">
              {system ? 'Sistema da campanha — atributos adicionados automaticamente' : 'Sem sistema — adicione atributos manualmente depois'}
            </p>
          </div>
        </div>

        {/* Nome */}
        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Lyra Sombramoon…"
            className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Raça / Clã</label>
            <input value={form.race} onChange={e => set('race', e.target.value)}
              placeholder="Meio-Elfo, Gangrel…"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax" />
          </div>
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Classe / Conceito</label>
            <input value={form.class} onChange={e => set('class', e.target.value)}
              placeholder="Feiticeiro, Toreador…"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax" />
          </div>
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">Nível / Geração</label>
            <input value={form.level} onChange={e => set('level', e.target.value)}
              type="number" min="1" max="20"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax" />
          </div>
          <div>
            <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">HP / Vitalidade</label>
            <input value={form.maxHp} onChange={e => set('maxHp', e.target.value)}
              type="number" min="1"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax" />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-ink-soft font-bold uppercase tracking-widest block mb-1.5">URL da Imagem</label>
          <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)}
            placeholder="https://…"
            className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-wax" />
        </div>

        {error && <p className="text-sm text-wax">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Criando…' : 'Criar Personagem'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
