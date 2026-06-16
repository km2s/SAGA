'use client'

import { useState, useEffect } from 'react'
import { Search, Users, Zap, BookOpen, Clock, CheckCircle, XCircle, Send } from 'lucide-react'

interface OpenCampaign {
  id: string
  name: string
  description: string | null
  theme: string | null
  campaignType: string
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden"
        style={{ background: 'rgba(13,13,26,0.99)' }}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-cinzel text-base font-semibold text-saga-text">Inscrição</h2>
            <p className="text-[11px] text-saga-dim mt-0.5">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-saga-dim hover:text-saga-text transition-colors text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-5 pb-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-saga-muted uppercase tracking-widest block mb-1.5">
              Seu nível de experiência no sistema
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map(lvl => (
                <button key={lvl} type="button"
                  onClick={() => setExperienceLevel(lvl)}
                  className="py-2 px-2 rounded border text-[11px] font-medium transition-all"
                  style={{
                    background: experienceLevel === lvl ? 'rgba(201,162,42,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${experienceLevel === lvl ? 'rgba(201,162,42,0.45)' : 'rgba(255,255,255,0.1)'}`,
                    color: experienceLevel === lvl ? '#c9a22a' : '#7878a0',
                  }}>
                  {XP_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-saga-muted uppercase tracking-widest block mb-1.5">
              Descreva seu personagem / ideia (opcional)
            </label>
            <textarea
              value={characterDesc}
              onChange={e => setCharacterDesc(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Quem é seu personagem? Qual conceito você tem em mente?"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/60 transition-colors resize-none"
            />
            <p className="text-[9px] text-saga-dim mt-1 text-right">{characterDesc.length}/1000</p>
          </div>
          {error && <p className="text-sm text-saga-danger">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded text-sm text-saga-muted hover:text-saga-text transition-colors border border-white/10">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg,#c9a22a,#f0d060)', color: '#0a0a12' }}>
              <Send size={13} />
              {loading ? 'Enviando...' : 'Enviar Inscrição'}
            </button>
          </div>
        </form>
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

  function getApplicationStatus(c: OpenCampaign) {
    return c.applications?.[0]?.status ?? null
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold text-saga-text">Explorar Campanhas</h1>
        <p className="text-sm text-saga-muted mt-1">Encontre campanhas abertas e se inscreva para participar</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-saga-dim" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, sistema, tema..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-saga-text placeholder:text-saga-dim focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'campaign', 'oneshot'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all border"
              style={{
                background: typeFilter === t ? 'rgba(201,162,42,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${typeFilter === t ? 'rgba(201,162,42,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: typeFilter === t ? '#c9a22a' : '#7878a0',
              }}>
              {t === 'all' ? 'Todos' : t === 'campaign' ? 'Campanhas' : 'One-Shots'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-saga-dim">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto mb-4 text-saga-dim opacity-40" />
          <p className="text-saga-muted">Nenhuma campanha aberta encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => {
            const appStatus = getApplicationStatus(c)
            const playerCount = c._count.members - 1
            const slotsLeft = c.maxSlots !== null ? c.maxSlots - playerCount : null
            const isFull = slotsLeft !== null && slotsLeft <= 0

            return (
              <div key={c.id} className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col hover:border-white/20 transition-colors">
                {/* Header */}
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-cinzel font-semibold text-saga-text leading-tight">{c.name}</h3>
                    <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        background: c.campaignType === 'oneshot' ? 'rgba(124,58,237,0.15)' : 'rgba(201,162,42,0.12)',
                        color: c.campaignType === 'oneshot' ? '#9d5af5' : '#c9a22a',
                        border: `1px solid ${c.campaignType === 'oneshot' ? 'rgba(124,58,237,0.3)' : 'rgba(201,162,42,0.3)'}`,
                      }}>
                      {c.campaignType === 'oneshot' ? <><Zap size={9} />One-Shot</> : <><Clock size={9} />Campanha</>}
                    </span>
                  </div>

                  {c.system && (
                    <p className="text-[11px] text-saga-dim mb-2">{c.system.name}{c.theme ? ` · ${c.theme}` : ''}</p>
                  )}

                  {c.description && (
                    <p className="text-[12px] text-saga-muted leading-relaxed line-clamp-3">{c.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 flex items-center justify-between gap-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 text-[11px] text-saga-dim">
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {playerCount}{c.maxSlots ? `/${c.maxSlots}` : ''} jogadores
                    </span>
                    {c.members[0] && (
                      <span>GM: {c.members[0].user.username}</span>
                    )}
                  </div>

                  {appStatus === 'approved' ? (
                    <span className="text-[11px] text-saga-success flex items-center gap-1 font-medium">
                      <CheckCircle size={12} />Aprovado
                    </span>
                  ) : appStatus === 'rejected' ? (
                    <span className="text-[11px] text-saga-danger flex items-center gap-1">
                      <XCircle size={12} />Rejeitado
                    </span>
                  ) : appStatus === 'pending' ? (
                    <span className="text-[11px] text-saga-muted flex items-center gap-1">
                      <Clock size={12} />Aguardando
                    </span>
                  ) : isFull ? (
                    <span className="text-[11px] text-saga-dim">Sem vagas</span>
                  ) : successId === c.id ? (
                    <span className="text-[11px] text-saga-success flex items-center gap-1 font-medium">
                      <CheckCircle size={12} />Enviado!
                    </span>
                  ) : (
                    <button
                      onClick={() => setApplying(c)}
                      className="text-[11px] font-medium px-3 py-1.5 rounded transition-all"
                      style={{ background: 'rgba(201,162,42,0.12)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.3)' }}>
                      Inscrever-se
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
