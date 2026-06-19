'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Image as ImageIcon, FileText, Send, BookOpen, Eye } from 'lucide-react'
import { safeImageUrl } from '@/lib/safe-url'

interface HandoutEntry {
  id: string
  title: string | null
  content: string | null
  imageUrl: string | null
  createdAt: string
  sharedBy: { user: { username: string; avatar: string | null } }
  seenBy: { seenAt: string }[]
}

interface HandoutsPanelProps {
  campaignId: string
  isGM: boolean
  onClose: () => void
  activeSessionId?: string | null
}

export function HandoutsPanel({ campaignId, isGM, onClose, activeSessionId }: HandoutsPanelProps) {
  const [handouts, setHandouts] = useState<HandoutEntry[]>([])
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '' })
  const [posting, setPosting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'new'>('list')

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/handouts`).catch(() => null)
    if (!res?.ok) return
    const data = await res.json().catch(() => [])
    setHandouts(data)
  }, [campaignId])

  useEffect(() => {
    load()
    if (!activeSessionId) return
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [load, activeSessionId])

  async function shareHandout() {
    if (posting) return
    const { title, content, imageUrl } = form
    if (!title.trim() && !content.trim() && !imageUrl.trim()) return
    setPosting(true)
    const res = await fetch(`/api/campaigns/${campaignId}/handouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, imageUrl }),
    }).catch(() => null)
    setPosting(false)
    if (!res?.ok) return
    const h: HandoutEntry = await res.json().catch(() => null)
    if (h) setHandouts(prev => [h, ...prev])
    setForm({ title: '', content: '', imageUrl: '' })
    setTab('list')
  }

  async function deleteHandout(id: string) {
    await fetch(`/api/campaigns/${campaignId}/handouts/${id}`, { method: 'DELETE' }).catch(() => {})
    setHandouts(prev => prev.filter(h => h.id !== id))
    if (expanded === id) setExpanded(null)
  }

  async function markSeen(id: string) {
    await fetch(`/api/campaigns/${campaignId}/handouts/${id}`, { method: 'PATCH' }).catch(() => {})
    setHandouts(prev => prev.map(h =>
      h.id === id ? { ...h, seenBy: [{ seenAt: new Date().toISOString() }] } : h
    ))
  }

  function handleExpand(h: HandoutEntry) {
    setExpanded(prev => prev === h.id ? null : h.id)
    if (h.seenBy.length === 0) markSeen(h.id)
  }

  const unread = handouts.filter(h => h.seenBy.length === 0).length

  return (
    <div
      className="absolute top-3 right-3 z-40 w-80 rounded-xl overflow-hidden shadow-2xl flex flex-col"
      style={{
        maxHeight: 'calc(100vh - 80px)',
        background: 'rgba(10,10,22,0.97)',
        border: '1px solid rgba(201,162,42,0.25)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'rgba(201,162,42,0.2)', background: 'rgba(201,162,42,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={12} className="text-gold" />
          <span className="font-cinzel text-[11px] font-bold text-gold uppercase tracking-widest">Handouts</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-bg"
              style={{ background: '#c9a22a' }}>
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isGM && (
            <>
              <button
                onClick={() => setTab('list')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold font-cinzel transition-all ${
                  tab === 'list' ? 'text-gold' : 'text-saga-dim hover:text-saga-muted'
                }`}
                style={tab === 'list' ? { background: 'rgba(201,162,42,0.15)', border: '1px solid rgba(201,162,42,0.3)' } : {}}
              >
                Lista
              </button>
              <button
                onClick={() => setTab('new')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold font-cinzel transition-all ${
                  tab === 'new' ? 'text-gold' : 'text-saga-dim hover:text-saga-muted'
                }`}
                style={tab === 'new' ? { background: 'rgba(201,162,42,0.15)', border: '1px solid rgba(201,162,42,0.3)' } : {}}
              >
                + Novo
              </button>
            </>
          )}
          <button onClick={onClose} className="text-saga-dim hover:text-saga-text ml-1">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* New Handout Form (GM only) */}
      {isGM && tab === 'new' && (
        <div className="p-3 flex flex-col gap-2.5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Título (opcional)"
            className="w-full px-3 py-2 rounded text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Texto / descrição..."
            rows={3}
            className="w-full px-3 py-2 rounded text-[12px] text-saga-text placeholder:text-saga-dim focus:outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <div className="flex items-center gap-2">
            <ImageIcon size={11} className="text-saga-dim shrink-0" />
            <input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="URL da imagem (https://...)"
              className="flex-1 px-2 py-1.5 rounded text-[11px] text-saga-text placeholder:text-saga-dim focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <button
            onClick={shareHandout}
            disabled={posting || (!form.title.trim() && !form.content.trim() && !form.imageUrl.trim())}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-bold text-bg font-cinzel disabled:opacity-40 transition-opacity bg-gradient-gold"
          >
            <Send size={10} />
            {posting ? 'Enviando...' : 'Revelar aos Jogadores'}
          </button>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {handouts.length === 0 ? (
          <div className="py-8 text-center">
            <FileText size={28} className="text-saga-dim/30 mx-auto mb-2" />
            <p className="text-[11px] text-saga-dim">
              {isGM ? 'Nenhum handout compartilhado.' : 'Nenhum handout revelado ainda.'}
            </p>
            {isGM && (
              <button
                onClick={() => setTab('new')}
                className="mt-2 text-[10px] text-gold hover:underline"
              >
                Criar o primeiro
              </button>
            )}
          </div>
        ) : (
          handouts.map(h => {
            const isNew = h.seenBy.length === 0
            const isOpen = expanded === h.id
            const safeImg = safeImageUrl(h.imageUrl)
            return (
              <div
                key={h.id}
                className="border-b last:border-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                {/* Row header */}
                <button
                  className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/3 transition-colors"
                  onClick={() => handleExpand(h)}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5">
                    {safeImg
                      ? <ImageIcon size={13} className="text-gold/70" />
                      : <FileText size={13} className="text-saga-dim" />}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isNew && <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
                      <span className={`text-[12px] font-medium truncate ${isNew ? 'text-saga-text' : 'text-saga-muted'}`}>
                        {h.title || (h.content ? h.content.slice(0, 30) + (h.content.length > 30 ? '…' : '') : 'Imagem')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-saga-dim">por {h.sharedBy.user.username}</span>
                      {!isNew && (
                        <span className="flex items-center gap-0.5 text-[9px] text-saga-dim/60">
                          <Eye size={8} />visto
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Chevron */}
                  <span className={`text-saga-dim text-[10px] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-4 pb-4 flex flex-col gap-2">
                    {safeImg && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={safeImg} alt={h.title ?? 'handout'}
                        className="w-full rounded-lg object-cover max-h-48"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    )}
                    {h.content && (
                      <p className="text-[12px] text-saga-muted leading-relaxed whitespace-pre-wrap">
                        {h.content}
                      </p>
                    )}
                    {isGM && (
                      <button
                        onClick={() => deleteHandout(h.id)}
                        className="self-end flex items-center gap-1 text-[10px] text-saga-danger/60 hover:text-saga-danger transition-colors mt-1"
                      >
                        <Trash2 size={10} />Remover
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
