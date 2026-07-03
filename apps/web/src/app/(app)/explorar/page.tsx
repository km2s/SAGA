'use client'

import { useState, useEffect } from 'react'
import { Search, Users, Zap, BookOpen, Clock, CheckCircle, XCircle, Send, ChevronDown, ChevronUp } from 'lucide-react'

interface OpenCampaign {
  id: string
  name: string
  description: string | null
  theme: string | null
  campaignType: string
  contentTone: string | null
  playStyle: string | null
  sessionFrequency: string | null
  minExperience: string | null
  maxSlots: number | null
  _count: { members: number }
  system: { name: string } | null
  members: { user: { username: string } }[]
  applications: { status: string }[]
}

const XP_LABELS: Record<string, string> = {
  beginner:     'Iniciante',
  intermediate: 'Intermediário',
  advanced:     'Avançado',
}

const TONE_LABELS: Record<string, { label: string; emoji: string }> = {
  epic:         { label: 'Épico',             emoji: '⚔️' },
  dark:         { label: 'Sombrio',           emoji: '🌑' },
  horror:       { label: 'Terror',            emoji: '💀' },
  political:    { label: 'Político',          emoji: '👑' },
  adventure:    { label: 'Aventura',          emoji: '🗺️' },
  lighthearted: { label: 'Leve',              emoji: '🎲' },
}

const FREQ_LABELS: Record<string, string> = {
  weekly:   'Semanal',
  biweekly: 'Quinzenal',
  monthly:  'Mensal',
  sporadic: 'Esporádico',
}

const PLAY_LABELS: Record<string, string> = {
  roleplay:    'Roleplay',
  combat:      'Combate',
  exploration: 'Exploração',
  mystery:     'Mistério',
  sandbox:     'Sandbox',
  drama:       'Drama',
  comedy:      'Comédia',
  horror:      'Terror',
}

const XP_REQ_LABELS: Record<string, string> = {
  beginner:     'Iniciante+',
  intermediate: 'Intermediário+',
  advanced:     'Avançados apenas',
}

function ApplyModal({ campaign, onClose, onSuccess }: {
  campaign: OpenCampaign
  onClose: () => void
  onSuccess: () => void
}) {
  const [characterDesc, setCharacterDesc] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/campaigns/${campaign.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterDesc, experienceLevel }),
    }).catch(() => null)
    setLoading(false)
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Erro ao enviar inscrição')
      return
    }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="parchment-card relative z-10 w-full max-w-md rounded-xl overflow-hidden text-ink">
        <div className="px-5 py-4 flex items-center justify-between border-b border-ink/10">
          <div>
            <h2 className="font-cinzel text-base font-bold text-ink">Inscrição</h2>
            <p className="text-[11px] text-ink-soft mt-0.5 font-cormorant italic">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-wax transition-colors text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-5 pb-5 pt-4 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-wax uppercase tracking-widest block mb-1.5">
              Seu nível de experiência no sistema
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map(lvl => (
                <button key={lvl} type="button"
                  onClick={() => setExperienceLevel(lvl)}
                  className={`py-2 px-2 rounded border text-[11px] font-cinzel tracking-wide transition-all ${
                    experienceLevel === lvl
                      ? 'bg-wax text-parchment border-wax-deep'
                      : 'bg-parchment/50 text-ink-soft border-ink/20 hover:border-wax'
                  }`}>
                  {XP_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-wax uppercase tracking-widest block mb-1.5">
              Descreva seu personagem / ideia (opcional)
            </label>
            <textarea
              value={characterDesc}
              onChange={e => setCharacterDesc(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Quem é seu personagem? Qual conceito você tem em mente?"
              className="w-full bg-parchment/60 border border-ink/20 rounded px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax transition-colors resize-none font-cormorant"
            />
            <p className="text-[9px] text-ink-soft mt-1 text-right">{characterDesc.length}/1000</p>
          </div>
          {error && <p className="text-sm text-wax">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded text-sm text-ink-soft hover:text-ink transition-colors border border-ink/20">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded text-sm font-cinzel flex items-center gap-2 disabled:opacity-50 transition-all bg-wax text-parchment hover:bg-wax-deep shadow-sm">
              <Send size={13} />
              {loading ? 'Enviando...' : 'Enviar Inscrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CampaignCard({ c, onApply, successId }: {
  c: OpenCampaign
  onApply: (c: OpenCampaign) => void
  successId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const appStatus = c.applications?.[0]?.status ?? null
  const playerCount = c._count.members - 1
  const slotsLeft = c.maxSlots !== null ? c.maxSlots - playerCount : null
  const isFull = slotsLeft !== null && slotsLeft <= 0

  const playStyles: string[] = (() => {
    try { return c.playStyle ? JSON.parse(c.playStyle) : [] } catch { return [] }
  })()

  const tone = c.contentTone ? TONE_LABELS[c.contentTone] : null

  const hasExtra = tone || playStyles.length > 0 || c.sessionFrequency || c.minExperience
  const descLong = (c.description ?? '').length > 200

  return (
    <div className="parchment-card rounded-xl overflow-hidden flex flex-col card-hover">
      <div className="relative p-4 flex-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-cinzel font-bold text-ink leading-tight">{c.name}</h3>
          <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
            c.campaignType === 'oneshot'
              ? 'bg-purple/10 text-purple border-purple/40'
              : 'bg-gold/15 text-gold-deep border-gold/40'
          }`}>
            {c.campaignType === 'oneshot' ? <><Zap size={9} />One-Shot</> : <><Clock size={9} />Campanha</>}
          </span>
        </div>

        {/* System + theme */}
        {(c.system || c.theme) && (
          <p className="text-[11px] text-ink-soft mb-2 font-cormorant">
            {[c.system?.name, c.theme].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Description */}
        {c.description && (
          <div className="mb-3">
            <p className={`text-[13px] text-ink-soft leading-relaxed font-cormorant ${!expanded && descLong ? 'line-clamp-3' : ''}`}>
              {c.description}
            </p>
            {descLong && (
              <button onClick={() => setExpanded(v => !v)}
                className="mt-1 text-[10px] text-ink-soft hover:text-wax transition-colors flex items-center gap-0.5">
                {expanded ? <><ChevronUp size={11} />Menos</> : <><ChevronDown size={11} />Ler mais</>}
              </button>
            )}
          </div>
        )}

        {/* Chips */}
        {hasExtra && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tone && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink/5 text-ink-soft border border-ink/15">
                {tone.emoji} {tone.label}
              </span>
            )}
            {playStyles.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple/10 text-purple border border-purple/25">
                {PLAY_LABELS[s] ?? s}
              </span>
            ))}
            {c.sessionFrequency && (
              <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-ink/5 text-ink-soft border border-ink/12">
                <Clock size={9} />{FREQ_LABELS[c.sessionFrequency] ?? c.sessionFrequency}
              </span>
            )}
            {c.minExperience && XP_REQ_LABELS[c.minExperience] && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/25">
                {XP_REQ_LABELS[c.minExperience]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative px-4 py-3 flex items-center justify-between gap-2 border-t border-ink/10">
        <div className="flex items-center gap-3 text-[11px] text-ink-soft font-cormorant">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {playerCount}{c.maxSlots ? `/${c.maxSlots}` : ''} jogadores
          </span>
          {c.members[0] && (
            <span>GM: {c.members[0].user.username}</span>
          )}
        </div>

        {appStatus === 'approved' ? (
          <span className="text-[11px] text-green-800 flex items-center gap-1 font-medium">
            <CheckCircle size={12} />Aprovado
          </span>
        ) : appStatus === 'rejected' ? (
          <span className="text-[11px] text-wax flex items-center gap-1">
            <XCircle size={12} />Rejeitado
          </span>
        ) : appStatus === 'pending' ? (
          <span className="text-[11px] text-ink-soft flex items-center gap-1">
            <Clock size={12} />Aguardando
          </span>
        ) : isFull ? (
          <span className="text-[11px] text-ink-soft">Sem vagas</span>
        ) : successId === c.id ? (
          <span className="text-[11px] text-green-800 flex items-center gap-1 font-medium">
            <CheckCircle size={12} />Enviado!
          </span>
        ) : (
          <button
            onClick={() => onApply(c)}
            className="text-[11px] font-cinzel px-3 py-1.5 rounded transition-all bg-wax text-parchment hover:bg-wax-deep shadow-sm">
            Inscrever-se
          </button>
        )}
      </div>
    </div>
  )
}

export default function ExplorarPage() {
  const [campaigns, setCampaigns] = useState<OpenCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'campaign' | 'oneshot'>('all')
  const [applying, setApplying] = useState<OpenCampaign | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/campaigns/open')
      .then(r => r.json())
      .then((data: OpenCampaign[]) => { if (Array.isArray(data)) setCampaigns(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = campaigns.filter(c => {
    if (typeFilter !== 'all' && c.campaignType !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.theme ?? '').toLowerCase().includes(q) ||
        (c.system?.name ?? '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <p className="font-cinzel text-[11px] tracking-[0.35em] text-wax uppercase">⚜ Taverna</p>
        <h1 className="font-cinzel text-3xl font-bold text-ink">Explorar Campanhas</h1>
        <p className="text-sm text-ink-soft mt-1 font-cormorant italic">Encontre campanhas abertas e se inscreva para participar</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, sistema, tema..."
            className="w-full bg-parchment/60 border border-ink/20 rounded-lg pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-wax transition-colors font-cormorant"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'campaign', 'oneshot'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-[12px] font-cinzel tracking-wide transition-all border ${
                typeFilter === t
                  ? 'bg-wax text-parchment border-wax-deep'
                  : 'bg-parchment/50 text-ink-soft border-ink/20 hover:border-wax hover:text-wax'
              }`}>
              {t === 'all' ? 'Todos' : t === 'campaign' ? 'Campanhas' : 'One-Shots'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-ink-soft font-cormorant">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto mb-4 text-wax opacity-40" />
          <p className="text-ink-soft font-cormorant">Nenhuma campanha aberta encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CampaignCard key={c.id} c={c} onApply={setApplying} successId={successId} />
          ))}
        </div>
      )}

      {applying && (
        <ApplyModal
          campaign={applying}
          onClose={() => setApplying(null)}
          onSuccess={() => {
            setSuccessId(applying.id)
            setApplying(null)
            load()
          }}
        />
      )}
    </div>
  )
}
