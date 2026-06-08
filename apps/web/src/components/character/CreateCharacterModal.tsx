'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  Swords, Moon, Skull, Rocket, Dice6, Pencil,
  Sword, Flame, Globe, Castle, Sparkles, Target, Leaf, Zap, Ghost, Eye, Shield, Cpu, Monitor, Compass,
  BookOpen, Star, Key, ShieldCheck, Check, ChevronRight, ChevronLeft, Music
} from 'lucide-react'

interface Campaign { id: string; name: string }
interface SystemAttr { id: string; name: string; defaultDie: string; description?: string | null }
interface RPGSystem { id: string; name: string; isPreset: boolean; category: string; attributes: SystemAttr[] }

const CATEGORIES: { id: string; label: string; Icon: React.ElementType }[] = [
  { id: 'fantasy',           label: 'Fantasia',        Icon: Swords  },
  { id: 'world-of-darkness', label: 'Mundo das Trevas', Icon: Moon   },
  { id: 'horror',            label: 'Horror',           Icon: Skull  },
  { id: 'scifi',             label: 'Sci-Fi',           Icon: Rocket },
  { id: 'generic',           label: 'Genérico',         Icon: Dice6  },
  { id: 'custom',            label: 'Personalizado',    Icon: Pencil },
]

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

export function CreateCharacterModal({ campaigns, open, onClose }: {
  campaigns: Campaign[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<'system' | 'info'>('system')
  const [systems, setSystems] = useState<RPGSystem[]>([])
  const [loadingSystems, setLoadingSystems] = useState(false)
  const [activeCategory, setActiveCategory] = useState('fantasy')
  const [selectedSystem, setSelectedSystem] = useState<RPGSystem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    campaignId: campaigns[0]?.id ?? '',
    name: '', race: '', class: '',
    level: '1', maxHp: '10', imageUrl: '',
  })

  useEffect(() => {
    if (!open) { setStep('system'); setSelectedSystem(null); setError(''); return }
    setLoadingSystems(true)
    fetch('/api/systems')
      .then(r => r.json())
      .then((data: RPGSystem[]) => { setSystems(data); setLoadingSystems(false) })
      .catch(() => setLoadingSystems(false))
  }, [open])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

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
        systemId: selectedSystem?.name !== 'Personalizado' ? selectedSystem?.id : null,
      }),
    }).catch(() => null)

    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao criar personagem')
      return
    }
    onClose()
    router.refresh()
  }

  const categorySystems = systems.filter(s => (s.category ?? 'custom') === activeCategory)
  const hasPresetAttrs = (selectedSystem?.attributes.length ?? 0) > 0

  return (
    <Modal open={open} onClose={onClose} title="Criar Personagem">
      {step === 'system' ? (
        <div className="flex flex-col gap-0" style={{ minHeight: 480 }}>
          <p className="text-sm text-saga-muted mb-4">
            Escolha o sistema de jogo. Sistemas pré-definidos já vêm com todos os atributos preenchidos automaticamente.
          </p>

          {/* Category tabs */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-surface-2 text-saga-muted border border-border hover:border-border-bright'
                }`}>
                <cat.Icon size={11} /> {cat.label}
              </button>
            ))}
          </div>

          {/* System grid */}
          {loadingSystems ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 340 }}>
              <div className="grid grid-cols-2 gap-2">
                {categorySystems.map(sys => {
                  const SysIcon = SYSTEM_ICONS[sys.name] ?? Dice6
                  const isSelected = selectedSystem?.id === sys.id
                  return (
                    <button key={sys.id} onClick={() => setSelectedSystem(sys)}
                      className={`flex flex-col items-start gap-2 p-3 rounded-lg border transition-all text-left ${
                        isSelected ? 'border-gold/50 bg-gold/8' : 'border-border hover:border-border-bright hover:bg-surface-2'
                      }`}>
                      <div className="flex items-center gap-2 w-full">
                        <SysIcon size={15} className="text-saga-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-gold' : 'text-saga-text'}`}>{sys.name}</p>
                        </div>
                        {isSelected && <Check size={12} className="text-gold shrink-0" />}
                      </div>
                      {sys.attributes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sys.attributes.slice(0, 3).map(a => (
                            <span key={a.id} className="text-[9px] bg-surface-3 border border-border px-1.5 py-0.5 rounded text-saga-dim">
                              {a.name}
                            </span>
                          ))}
                          {sys.attributes.length > 3 && (
                            <span className="text-[9px] text-saga-dim self-center">+{sys.attributes.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[9px] text-saga-dim">Atributos livres — você define</p>
                      )}
                    </button>
                  )
                })}
                {categorySystems.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-sm text-saga-muted">Carregando sistemas...</div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="button" disabled={!selectedSystem} onClick={() => setStep('info')}>
              <span className="flex items-center gap-1.5">Próximo <ChevronRight size={14} /></span>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* System badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gold/20 bg-gold/6">
            {(() => { const SelIcon = SYSTEM_ICONS[selectedSystem?.name ?? ''] ?? Dice6; return <SelIcon size={16} className="text-saga-muted shrink-0" /> })()}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gold truncate">{selectedSystem?.name}</p>
              <p className="text-[10px] text-saga-muted">
                {hasPresetAttrs
                  ? `${selectedSystem?.attributes.length} atributos adicionados automaticamente`
                  : 'Adicione atributos manualmente depois'}
              </p>
            </div>
            <button type="button" onClick={() => setStep('system')} className="text-[10px] text-saga-muted hover:text-gold underline shrink-0">
              Alterar
            </button>
          </div>

          {/* Campaign */}
          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Campanha</label>
            <select value={form.campaignId} onChange={e => set('campaignId', e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60">
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Lyra Sombramoon..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Raça / Clã</label>
              <input value={form.race} onChange={e => set('race', e.target.value)} placeholder="Meio-Elfo, Gangrel..."
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Classe / Conceito</label>
              <input value={form.class} onChange={e => set('class', e.target.value)} placeholder="Feiticeiro, Toreador..."
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nível / Geração</label>
              <input value={form.level} onChange={e => set('level', e.target.value)} type="number" min="1" max="20"
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">HP / Vitalidade</label>
              <input value={form.maxHp} onChange={e => set('maxHp', e.target.value)} type="number" min="1"
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">URL da Imagem</label>
            <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold/60" />
          </div>

          {error && <p className="text-sm text-saga-danger">{error}</p>}
          <div className="flex justify-between gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setStep('system')}>
              <span className="flex items-center gap-1.5"><ChevronLeft size={14} />Voltar</span>
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Personagem'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
