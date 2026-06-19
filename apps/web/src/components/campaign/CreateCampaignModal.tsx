'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChevronRight, ChevronLeft, ChevronDown, BookOpen } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

interface RPGSystem { id: string; name: string; category: string }

const CATEGORY_ORDER = ['fantasy', 'world-of-darkness', 'horror', 'scifi', 'generic', 'custom']

const TONES = [
  { value: 'epic',         emoji: '⚔️' },
  { value: 'dark',         emoji: '🌑' },
  { value: 'horror',       emoji: '💀' },
  { value: 'political',    emoji: '👑' },
  { value: 'adventure',    emoji: '🗺️' },
  { value: 'lighthearted', emoji: '🎲' },
] as const

const PLAY_STYLES = ['roleplay', 'combat', 'exploration', 'mystery', 'sandbox', 'drama', 'comedy', 'horror'] as const

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'sporadic'] as const

const MIN_XP = ['none', 'beginner', 'intermediate', 'advanced'] as const

interface Props { open: boolean; onClose: () => void }

export function CreateCampaignModal({ open, onClose }: Props) {
  const router = useRouter()
  const { t } = useLocale()
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

  const SYSTEM_CATEGORIES = CATEGORY_ORDER.map(v => ({ value: v, label: (t.systemCategories as Record<string, string>)[v] ?? v }))
  const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(SYSTEM_CATEGORIES.map(c => [c.value, c.label]))
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
    if (!form.name.trim()) { setError(t.errors.nameRequired); setStep(1); return }
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
        setError(data.error ?? t.errors.createCampaign)
        return
      }
      const campaign = await res.json()
      handleClose()
      router.push(`/campaign/${campaign.id}`)
      router.refresh()
    } catch {
      setError(t.errors.connection)
    } finally {
      setLoading(false)
    }
  }

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: systems.filter(s => s.category === cat) }))
    .filter(g => g.items.length > 0)

  const inputCls = 'w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors'

  return (
    <Modal open={open} onClose={handleClose} title={t.createCampaign.title}>
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
              {n === 1 ? t.createCampaign.stepBasic : t.createCampaign.stepDetails}
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
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">{t.createCampaign.adventureType}</label>
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
                        {type === 'campaign' ? t.createCampaign.typeCampaign : t.createCampaign.typeOneshot}
                      </span>
                      <span className="text-[10px] text-saga-dim leading-tight">
                        {type === 'campaign' ? t.createCampaign.typeCampaignDesc : t.createCampaign.typeOneshotDesc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCampaign.nameLabel} *</label>
              <input name="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t.createCampaign.namePlaceholder} className={inputCls} />
            </div>

            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCampaign.systemLabel}</label>
              <div ref={systemDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSystemDropdownOpen(o => !o)}
                  className={`${inputCls} flex items-center justify-between gap-2 cursor-pointer`}
                >
                  <span className={form.systemName ? 'text-saga-text' : 'text-saga-dim'}>
                    {form.systemName || t.createCampaign.systemNone}
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
                      {t.createCampaign.systemNone}
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
                      {t.createCampaign.customSystemName} <span className="font-normal normal-case tracking-normal text-saga-dim">({t.common.optional})</span>
                    </label>
                    <input
                      value={form.customSystemName}
                      onChange={e => setForm(f => ({ ...f, customSystemName: e.target.value }))}
                      placeholder={t.createCampaign.customSystemNamePlaceholder}
                      className={`${inputCls} w-full`}
                    />
                  </div>

                  <div className="border-t border-white/[0.07] pt-3">
                    <div className="flex items-start gap-3">
                      <BookOpen size={14} className="text-saga-muted shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[12px] text-saga-text font-medium leading-snug">{t.createCampaign.addToCatalog}</p>
                        <p className="text-[11px] text-saga-dim mt-0.5">{t.createCampaign.addToCatalogDesc}</p>
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
                          <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCampaign.categoryLabel}</label>
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
                            {t.createCampaign.systemDescLabel} <span className="font-normal normal-case tracking-normal text-saga-dim">({t.common.optional})</span>
                          </label>
                          <textarea
                            value={form.systemDescription}
                            onChange={e => setForm(f => ({ ...f, systemDescription: e.target.value }))}
                            rows={2}
                            maxLength={500}
                            placeholder={t.createCampaign.systemDescPlaceholder}
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
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCampaign.themeLabel}</label>
              <input value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                placeholder={t.createCampaign.themePlaceholder} className={inputCls} />
            </div>

            {error && <p className="text-sm text-saga-danger">{error}</p>}

            <div className="flex justify-end pt-1">
              <Button variant="primary" type="button"
                onClick={() => { if (!form.name.trim()) { setError(t.errors.nameRequired); return }; setError(''); setStep(2) }}>
                {t.common.next} <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ── ETAPA 2 ── */}
        {step === 2 && (
          <>
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">{t.createCampaign.descLabel}</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} maxLength={2000}
                placeholder={t.createCampaign.descPlaceholder}
                className={`${inputCls} resize-none`} />
              <p className="text-[9px] text-saga-dim mt-1 text-right">{form.description.length}/2000</p>
            </div>

            {/* Tone */}
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">{t.createCampaign.toneLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(tone => {
                  const sel = form.contentTone === tone.value
                  return (
                    <button key={tone.value} type="button"
                      onClick={() => setForm(f => ({ ...f, contentTone: sel ? '' : tone.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        sel ? 'bg-gold/10 border-gold/45' : 'bg-white/[0.03] border-white/10'
                      }`}>
                      <span className="text-base leading-none">{tone.emoji}</span>
                      <span className={`text-[11px] font-medium ${sel ? 'text-gold' : 'text-saga-muted'}`}>
                        {(t.createCampaign.tones as Record<string, string>)[tone.value]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Play style */}
            <div>
              <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">
                {t.createCampaign.playStyleLabel} <span className="text-saga-dim font-normal normal-case tracking-normal">{t.createCampaign.playStyleHint}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PLAY_STYLES.map(style => {
                  const sel = form.playStyle.includes(style)
                  return (
                    <button key={style} type="button" onClick={() => toggleStyle(style)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                        sel ? 'bg-purple/15 border-purple/50 text-purple-bright' : 'bg-white/[0.04] border-white/10 text-saga-muted'
                      }`}>
                      {(t.createCampaign.styles as Record<string, string>)[style]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Frequency & Min XP */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">{t.createCampaign.frequencyLabel}</label>
                <div className="space-y-1.5">
                  {FREQUENCIES.map(freq => {
                    const sel = form.sessionFrequency === freq
                    return (
                      <button key={freq} type="button"
                        onClick={() => setForm(fm => ({ ...fm, sessionFrequency: sel ? '' : freq }))}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                          sel ? 'bg-gold/[0.08] border-gold/40' : 'bg-white/[0.03] border-white/8'
                        }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sel ? 'bg-gold' : 'bg-white/20'}`} />
                        <span className={`text-[11px] ${sel ? 'text-gold font-medium' : 'text-saga-muted'}`}>
                          {(t.createCampaign.frequencies as Record<string, string>)[freq]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-saga-muted font-bold uppercase tracking-widest block mb-2">{t.createCampaign.minXpLabel}</label>
                <div className="space-y-1.5">
                  {MIN_XP.map(xp => {
                    const sel = form.minExperience === xp
                    return (
                      <button key={xp} type="button"
                        onClick={() => setForm(f => ({ ...f, minExperience: xp }))}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-left transition-all ${
                          sel ? 'bg-gold/[0.08] border-gold/40' : 'bg-white/[0.03] border-white/8'
                        }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sel ? 'bg-gold' : 'bg-white/20'}`} />
                        <span className={`text-[11px] ${sel ? 'text-gold font-medium' : 'text-saga-muted'}`}>
                          {(t.createCampaign.minXp as Record<string, string>)[xp]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Applications */}
            <div className="rounded-lg p-3 bg-white/[0.03] border border-white/8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-saga-text">{t.createCampaign.openLabel}</p>
                  <p className="text-[10px] text-saga-dim mt-0.5">{t.createCampaign.openDesc}</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
                  className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${form.isOpen ? 'bg-gold' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.isOpen ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
              {form.isOpen && (
                <div className="mt-3 pt-3 border-t border-white/[0.07]">
                  <label className="text-[10px] text-saga-muted font-bold uppercase tracking-widest block mb-1.5">
                    {t.createCampaign.maxSlotsLabel} <span className="font-normal normal-case tracking-normal text-saga-dim">({t.common.optional})</span>
                  </label>
                  <input type="number" min="1" max="20" value={form.maxSlots}
                    onChange={e => setForm(f => ({ ...f, maxSlots: e.target.value }))}
                    placeholder={t.createCampaign.maxSlotsPlaceholder}
                    className={inputCls} />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-saga-danger">{error}</p>}

            <div className="flex justify-between pt-1">
              <Button variant="secondary" type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={14} className="mr-1" /> {t.common.back}
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? t.common.creating : t.createCampaign.createBtn}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
