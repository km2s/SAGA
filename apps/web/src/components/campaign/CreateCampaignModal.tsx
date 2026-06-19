'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChevronRight, ChevronLeft, ChevronDown, BookOpen } from 'lucide-react'

interface RPGSystem { id: string; name: string; category: string }

const SYSTEM_CATEGORIES = [
  { value: 'fantasy',           label: 'Fantasia' },
  { value: 'world-of-darkness', label: 'World of Darkness' },
  { value: 'horror',            label: 'Horror' },
  { value: 'scifi',             label: 'Sci-Fi / Cyberpunk' },
  { value: 'generic',           label: 'Genérico / Indie' },
  { value: 'custom',            label: 'Personalizado / Homebrew' },
]

const CATEGORY_LABELS: Record<string, string> = {
  fantasy: 'Fantasia',
  'world-of-darkness': 'World of Darkness',
  horror: 'Horror',
  scifi: 'Sci-Fi / Cyberpunk',
  generic: 'Genérico / Indie',
  custom: 'Personalizado',
}
const CATEGORY_ORDER = ['fantasy', 'world-of-darkness', 'horror', 'scifi', 'generic', 'custom']

const TONES = [
  { value: 'epic',      label: 'Épico',              emoji: '⚔️' },
  { value: 'dark',      label: 'Sombrio',             emoji: '🌑' },
  { value: 'horror',    label: 'Terror',              emoji: '💀' },
  { value: 'political', label: 'Intrigas Políticas',  emoji: '👑' },
  { value: 'adventure', label: 'Aventura',            emoji: '🗺️' },
  { value: 'lighthearted', label: 'Leve / Casual',   emoji: '🎲' },
]

const PLAY_STYLES = [
  { value: 'roleplay',    label: 'Roleplay Intenso' },
  { value: 'combat',      label: 'Foco em Combate' },
  { value: 'exploration', label: 'Exploração' },
  { value: 'mystery',     label: 'Mistério' },
  { value: 'sandbox',     label: 'Sandbox' },
  { value: 'drama',       label: 'Drama' },
  { value: 'comedy',      label: 'Comédia' },
  { value: 'horror',      label: 'Terror' },
]

const FREQUENCIES = [
  { value: 'weekly',    label: 'Semanal' },
  { value: 'biweekly',  label: 'Quinzenal' },
  { value: 'monthly',   label: 'Mensal' },
  { value: 'sporadic',  label: 'Esporádico' },
]

const MIN_XP = [
  { value: 'none',         label: 'Qualquer nível' },
  { value: 'beginner',     label: 'Iniciante ou mais' },
  { value: 'intermediate', label: 'Intermediário ou mais' },
  { value: 'advanced',     label: 'Apenas avançados' },
]

interface Props { open: boolean; onClose: () => void }

export function CreateCampaignModal({ open, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [systems, setSystems] = useState<RPGSystem[]>([])
  const [systemDropdownOpen, setSystemDropdownOpen] = useState(false)
  const systemDropdownRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    name: '',
    systemName: '',
    campaignType: 'campaign' as 'campaign' | 'oneshot',
    theme: '',
    description: '',
    contentTone: '',
    playStyle: [] as string[],
    sessionFrequency: '',
    minExperience: 'none',
    isOpen: false,
    maxSlots: '',
    addToSystems: false,
    systemCategory: 'custom',
    systemDescription: '',
    customSystemName: '',
  })

  const isPersonalizado = form.systemName === 'Personalizado'

  useEffect(() => {
    if (!open) return
    fetch('/api/systems')
      .then(r => r.json())
      .then((data: RPGSystem[]) => Array.isArray(data) && setSystems(data))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!systemDropdownOpen) return
    function onMouseDown(e: MouseEvent) {
      if (systemDropdownRef.current && !systemDropdownRef.current.contains(e.target as Node)) {
        setSystemDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [systemDropdownOpen])

  function toggleStyle(val: string) {
    setForm(f => ({
      ...f,
      playStyle: f.playStyle.includes(val)
        ? f.playStyle.filter(s => s !== val)
        : [...f.playStyle, val],
    }))
  }

  function handleClose() {
    setStep(1)
    setError('')
    setForm({ name: '', systemName: '', campaignType: 'campaign', theme: '', description: '', contentTone: '', playStyle: [], sessionFrequency: '', minExperience: 'none', isOpen: false, maxSlots: '', addToSystems: false, systemCategory: 'custom', systemDescription: '', customSystemName: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório'); setStep(1); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          theme: form.theme,
          systemName: form.systemName,
          campaignType: form.campaignType,
          contentTone: form.contentTone || null,
          playStyle: form.playStyle.length ? JSON.stringify(form.playStyle) : null,
          sessionFrequency: form.sessionFrequency || null,
          minExperience: form.minExperience !== 'none' ? form.minExperience : null,
          isOpen: form.isOpen,
          maxSlots: form.isOpen && form.maxSlots ? parseInt(form.maxSlots) : null,
          addToSystems: isPersonalizado && form.addToSystems,
          customSystemName: isPersonalizado && form.customSystemName.trim() ? form.customSystemName.trim() : undefined,
          systemCategory: form.systemCategory,
          systemDescription: form.systemDescription || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar campanha')
        return
      }
      const campaign = await res.json()
      handleClose()
      router.push(`/campaign/${campaign.id}`)
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: systems.filter(s => s.category === cat) }))
    .filter(g => g.items.length > 0)

  const inputCls = 'w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors'

  return (
    <Modal open={open} onClose={handleClose} title="Nova Campanha">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {([1, 2] as const).map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
              step === n
                ? 'bg-gold text-bg'
                : step > n
                  ? 'bg-gold/30 text-gold'
                  : 'bg-surface-2 text-saga-dim'
            }`}>{n}</div>
            <span className={`text-[11px] transition-colors ${step === n ? 'text-saga-text font-medium' : 'text-saga-dim'}`}>
              {n === 1 ? 'Básico' : 'Detalhes'}
            </span>
            {n < 2 && <ChevronRight size={13} className="text-saga-dim" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── ETAPA 1 ── */}
        {step === 1 && (
          <>
            {/* Tipo */}
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">Tipo de Aventura</label>
              <div className="grid grid-cols-2 gap-2">
                {(['campaign', 'oneshot'] as const).map(type => {
                  const sel = form.campaignType === type
                  return (
                    <button key={type} type="button"
                      onClick={() => setForm(f => ({ ...f, campaignType: type }))}
                      className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg border transition-all text-left ${
                        sel ? 'bg-gold/10 border-gold/45' : 'bg-white/[0.03] border-white/10'
                      }`}>
                      <span className={`text-[12px] font-semibold ${sel ? 'text-gold' : 'text-saga-muted'}`}>
                        {type === 'campaign' ? 'Campanha' : 'One-Shot'}
                      </span>
                      <span className="text-[10px] text-saga-dim leading-tight">
                        {type === 'campaign' ? 'Múltiplas sessões, personagens evoluem' : 'Sessão única e completa'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Nome *</label>
              <input name="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="A Maldição dos Dragões..." className={inputCls} />
            </div>

            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Sistema</label>
              <div ref={systemDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSystemDropdownOpen(o => !o)}
                  className={`${inputCls} flex items-center justify-between gap-2 cursor-pointer`}
                >
                  <span className={form.systemName ? 'text-saga-text' : 'text-saga-dim'}>
                    {form.systemName || 'Nenhum / Livre'}
                  </span>
                  <ChevronDown size={14} className={`text-saga-dim shrink-0 transition-transform duration-150 ${systemDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {systemDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg overflow-hidden bg-surface-2 border border-white/10 shadow-2xl shadow-black/60 max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, systemName: '', addToSystems: false, customSystemName: '', systemDescription: '' })); setSystemDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!form.systemName ? 'text-gold bg-gold/10' : 'text-saga-muted hover:bg-white/5 hover:text-saga-text'}`}
                    >
                      Nenhum / Livre
                    </button>
                    {grouped.map(({ cat, items }) => (
                      <div key={cat}>
                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-saga-dim bg-black/20 border-t border-white/5">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </div>
                        {items.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, systemName: s.name, addToSystems: false, customSystemName: '', systemDescription: '' })); setSystemDropdownOpen(false) }}
                            className={`w-full text-left px-4 pl-7 py-2 text-[13px] transition-colors ${form.systemName === s.name ? 'text-gold bg-gold/10' : 'text-saga-muted hover:bg-white/5 hover:text-saga-text'}`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opções extras quando "Personalizado" é selecionado */}
              {isPersonalizado && (
                <div className="mt-2 rounded-lg p-3 space-y-3 bg-white/[0.03] border border-white/8">

                  <div>
                    <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
                      Nome do sistema <span className="font-normal normal-case tracking-normal text-saga-dim">(opcional)</span>
                    </label>
                    <input
                      value={form.customSystemName}
                      onChange={e => setForm(f => ({ ...f, customSystemName: e.target.value }))}
                      placeholder="Ex: Sistema Homebrew da Karine…"
                      className={`${inputCls} w-full`}
                    />
                  </div>

                  <div className="border-t border-white/[0.07] pt-3">
                    <div className="flex items-start gap-3">
                      <BookOpen size={14} className="text-saga-muted shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[12px] text-saga-text font-medium leading-snug">Adicionar ao catálogo do Saga</p>
                        <p className="text-[11px] text-saga-dim mt-0.5">
                          Sistema ficará visível na aba de Sistemas para outros usuários.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, addToSystems: !f.addToSystems }))}
                        className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${form.addToSystems ? 'bg-gold' : 'bg-white/10'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.addToSystems ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {form.addToSystems && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Categoria</label>
                          <div className="flex flex-wrap gap-1.5">
                            {SYSTEM_CATEGORIES.map(cat => {
                              const sel = form.systemCategory === cat.value
                              return (
                                <button key={cat.value} type="button"
                                  onClick={() => setForm(f => ({ ...f, systemCategory: cat.value }))}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                                    sel ? 'bg-gold/15 border-gold/50 text-gold' : 'bg-white/[0.04] border-white/10 text-saga-muted'
                                  }`}>
                                  {cat.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
                            Descrição <span className="font-normal normal-case tracking-normal text-saga-dim">(opcional)</span>
                          </label>
                          <textarea
                            value={form.systemDescription}
                            onChange={e => setForm(f => ({ ...f, systemDescription: e.target.value }))}
                            rows={2}
                            maxLength={500}
                            placeholder="Descreva as mecânicas, ambientação e estilo de jogo deste sistema…"
                            className={`${inputCls} resize-none w-full`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Tema / Ambientação</label>
              <input value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                placeholder="Medieval, sci-fi, horror..." className={inputCls} />
            </div>

            {error && <p className="text-sm text-saga-danger">{error}</p>}

            <div className="flex justify-end pt-1">
              <Button variant="primary" type="button"
                onClick={() => { if (!form.name.trim()) { setError('Nome é obrigatório'); return }; setError(''); setStep(2) }}>
                Próximo <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ── ETAPA 2 ── */}
        {step === 2 && (
          <>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">Descrição da Campanha</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} maxLength={2000}
                placeholder="Descreva a temática, o cenário, o que os jogadores podem esperar..."
                className={`${inputCls} resize-none`} />
              <p className="text-[9px] text-saga-dim mt-1 text-right">{form.description.length}/2000</p>
            </div>

            {/* Tom */}
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">Tom da Campanha</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => {
                  const sel = form.contentTone === t.value
                  return (
                    <button key={t.value} type="button"
                      onClick={() => setForm(f => ({ ...f, contentTone: sel ? '' : t.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        sel ? 'bg-gold/10 border-gold/45' : 'bg-white/[0.03] border-white/10'
                      }`}>
                      <span className="text-base leading-none">{t.emoji}</span>
                      <span className={`text-[11px] font-medium ${sel ? 'text-gold' : 'text-saga-muted'}`}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Estilo de jogo */}
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">
                Estilo de Jogo <span className="text-saga-dim font-normal normal-case tracking-normal">(escolha quantos quiser)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PLAY_STYLES.map(s => {
                  const sel = form.playStyle.includes(s.value)
                  return (
                    <button key={s.value} type="button" onClick={() => toggleStyle(s.value)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                        sel ? 'bg-purple/15 border-purple/50 text-purple-bright' : 'bg-white/[0.04] border-white/10 text-saga-muted'
                      }`}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Frequência e Experiência mínima */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">Frequência de Sessões</label>
                <div className="space-y-1.5">
                  {FREQUENCIES.map(f => {
                    const sel = form.sessionFrequency === f.value
                    return (
                      <button key={f.value} type="button"
                        onClick={() => setForm(fm => ({ ...fm, sessionFrequency: sel ? '' : f.value }))}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                          sel ? 'bg-gold/[0.08] border-gold/40' : 'bg-white/[0.03] border-white/8'
                        }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sel ? 'bg-gold' : 'bg-white/20'}`} />
                        <span className={`text-[11px] ${sel ? 'text-gold font-medium' : 'text-saga-muted'}`}>{f.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">Experiência Mínima</label>
                <div className="space-y-1.5">
                  {MIN_XP.map(x => {
                    const sel = form.minExperience === x.value
                    return (
                      <button key={x.value} type="button"
                        onClick={() => setForm(f => ({ ...f, minExperience: x.value }))}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                          sel ? 'bg-gold/[0.08] border-gold/40' : 'bg-white/[0.03] border-white/8'
                        }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sel ? 'bg-gold' : 'bg-white/20'}`} />
                        <span className={`text-[11px] ${sel ? 'text-gold font-medium' : 'text-saga-muted'}`}>{x.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Inscrições */}
            <div className="rounded-lg p-3 bg-white/[0.03] border border-white/8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-saga-text">Aberta para inscrições</p>
                  <p className="text-[10px] text-saga-dim mt-0.5">Aparece em &quot;Explorar Campanhas&quot; para novos jogadores</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
                  className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${form.isOpen ? 'bg-gold' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.isOpen ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
              {form.isOpen && (
                <div className="mt-3 pt-3 border-t border-white/[0.07]">
                  <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
                    Número máximo de vagas (opcional)
                  </label>
                  <input type="number" min="1" max="20" value={form.maxSlots}
                    onChange={e => setForm(f => ({ ...f, maxSlots: e.target.value }))}
                    placeholder="Sem limite"
                    className={inputCls} />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-saga-danger">{error}</p>}

            <div className="flex justify-between pt-1">
              <Button variant="secondary" type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={14} className="mr-1" /> Voltar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Campanha'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
