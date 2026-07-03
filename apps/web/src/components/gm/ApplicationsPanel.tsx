'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface Application {
  id: string
  status: string
  characterDesc: string
  experienceLevel: string
  createdAt: string
  user: { id: string; username: string; avatar: string | null }
}

const XP_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

export function ApplicationsPanel({ campaignId }: { campaignId: string }) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  function load() {
    fetch(`/api/campaigns/${campaignId}/applications`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Application[]) => { if (Array.isArray(data)) setApplications(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [campaignId])

  async function decide(appId: string, status: 'approved' | 'rejected') {
    setActing(appId)
    await fetch(`/api/campaigns/${campaignId}/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
    setActing(null)
    load()
  }

  const pending  = applications.filter(a => a.status === 'pending')
  const resolved = applications.filter(a => a.status !== 'pending')

  if (loading) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-cinzel text-base font-semibold flex items-center gap-2">
          Inscrições
          {pending.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,162,42,0.15)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.35)' }}>
              {pending.length} pendente{pending.length !== 1 ? 's' : ''}
            </span>
          )}
        </h2>
      </div>

      {applications.length === 0 ? (
        <div className="bg-[#f5ecd6] border border-ink/20 rounded-lg px-4 py-8 text-center text-sm text-ink-soft">
          Nenhuma inscrição recebida ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {[...pending, ...resolved].map(app => (
            <div key={app.id} className="bg-[#f5ecd6] border border-ink/20 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-br from-purple to-gold">
                    {app.user.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{app.user.username}</p>
                    <p className="text-[10px] text-ink-soft">{XP_LABELS[app.experienceLevel] ?? app.experienceLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {app.status === 'pending' ? (
                    <>
                      <button
                        disabled={acting === app.id}
                        onClick={() => void decide(app.id, 'rejected')}
                        className="w-7 h-7 rounded flex items-center justify-center transition-all text-ink-soft hover:text-red-700 hover:bg-saga-danger/10 disabled:opacity-40">
                        <XCircle size={15} />
                      </button>
                      <button
                        disabled={acting === app.id}
                        onClick={() => void decide(app.id, 'approved')}
                        className="w-7 h-7 rounded flex items-center justify-center transition-all text-ink-soft hover:text-green-700 hover:bg-saga-success/10 disabled:opacity-40">
                        <CheckCircle size={15} />
                      </button>
                    </>
                  ) : app.status === 'approved' ? (
                    <span className="text-[11px] text-green-700 flex items-center gap-1"><CheckCircle size={11} />Aprovado</span>
                  ) : (
                    <span className="text-[11px] text-ink-soft flex items-center gap-1"><XCircle size={11} />Rejeitado</span>
                  )}
                  {app.characterDesc && (
                    <button
                      onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                      className="w-7 h-7 rounded flex items-center justify-center text-ink-soft hover:text-ink transition-all">
                      {expanded === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>
              {expanded === app.id && app.characterDesc && (
                <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(51,41,29,0.06)' }}>
                  <p className="text-[11px] text-ink-soft uppercase font-bold tracking-widest mt-2.5 mb-1">Descrição do personagem</p>
                  <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{app.characterDesc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
