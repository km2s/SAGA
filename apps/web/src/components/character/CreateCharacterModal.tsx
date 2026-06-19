'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'
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
  const { t } = useLocale()
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
    if (!form.name.trim()) { setError(t.errors.nameRequired); return }
    if (!form.campaignId) { setError(t.errors.selectCampaign); return }
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
      setError(data.error ?? t.errors.createCharacter)
      return
    }
    handleClose()
    router.refresh()
  }

  if (campaigns.length === 0) {
    return (
      <Modal open={open} onClose={handleClose} title={t.createCharacter.title}>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Dice6 size={40} className="text-saga-dim opacity-40" />
          <p className="text-sm text-saga-muted">{t.createCharacter.noCampaigns}</p>
          <Button variant="secondary" type="button" onClick={handleClose}>{t.common.close}</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={t.createCharacter.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Campaign — system is derived automatically */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
            {t.createCharacter.campaignLabel} *
          </label>
          {campaigns.length === 1 ? (
            // Uma única campanha — não precisa de dropdown
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/8 bg-white/[0.03]">
              <span className="text-sm text-saga-text font-medium">{selectedCampaign?.name}</span>
            </div>
          ) : (
            <select value={form.campaignId} onChange={e => set('campaignId', e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Sistema derivado da campanha */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
          style={{ borderColor: `${systemColor}30`, background: `${systemColor}08` }}>
          <SystemIcon size={16} style={{ color: systemColor }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: systemColor }}>
              {system?.name ?? t.createCharacter.customSystemLabel}
            </p>
            <p className="text-[10px] text-saga-dim">
              {system ? t.createCharacter.systemPreset : t.createCharacter.systemCustom}
            </p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCharacter.nameLabel} *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder={t.createCharacter.namePlaceholder}
            className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCharacter.raceLabel}</label>
            <input value={form.race} onChange={e => set('race', e.target.value)}
              placeholder={t.createCharacter.racePlaceholder}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCharacter.classLabel}</label>
            <input value={form.class} onChange={e => set('class', e.target.value)}
              placeholder={t.createCharacter.classPlaceholder}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCharacter.levelLabel}</label>
            <input value={form.level} onChange={e => set('level', e.target.value)}
              type="number" min="1" max="20"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCharacter.hpLabel}</label>
            <input value={form.maxHp} onChange={e => set('maxHp', e.target.value)}
              type="number" min="1"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCharacter.imageLabel}</label>
          <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)}
            placeholder="https://…"
            className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
        </div>

        {error && <p className="text-sm text-saga-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={handleClose}>{t.common.cancel}</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t.createCharacter.creating : t.createCharacter.createBtn}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
