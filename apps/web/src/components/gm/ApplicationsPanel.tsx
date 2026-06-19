'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

interface Application {
  id: string
  status: string
  characterDesc: string
  experienceLevel: string
  createdAt: string
  user: { id: string; username: string; avatar: string | null }
}

export function ApplicationsPanel({ campaignId }: { campaignId: string }) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const { t } = useLocale()

  const XP_LABELS: Record<string, string> = {
    beginner:     t.applications.xpBeginner,
    intermediate: t.applications.xpIntermediate,
    advanced:     t.applications.xpAdvanced,
  }

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
          {t.applications.title}
          {pending.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,162,42,0.15)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.35)' }}>
              {pending.length} {pending.length !== 1 ? t.applications.pendingPlural : t.applications.pending}
            </span>
          )}
        </h2>
      </div>

      {applications.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center text-sm text-saga-muted">
          {t.applications.noneYet}
        </div>
      ) : (
        <div className="space-y-2">
          {[...pending, ...resolved].map(app => (
            <div key={app.id} className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-br from-purple to-gold">
                    {app.user.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{app.user.username}</p>
                    <p className="text-[10px] text-saga-dim">{XP_LABELS[app.experienceLevel] ?? app.experienceLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {app.status === 'pending' ? (
                    <>
                      <button
                        disabled={acting === app.id}
                        onClick={() => void decide(app.id, 'rejected')}
                        className="w-7 h-7 rounded flex items-center justify-center transition-all text-saga-dim hover:text-saga-danger hover:bg-saga-danger/10 disabled:opacity-40">
                        <XCircle size={15} />
                      </button>
                      <button
                        disabled={acting === app.id}
                        onClick={() => void decide(app.id, 'approved')}
                        className="w-7 h-7 rounded flex items-center justify-center transition-all text-saga-dim hover:text-saga-success hover:bg-saga-success/10 disabled:opacity-40">
                        <CheckCircle size={15} />
                      </button>
                    </>
                  ) : app.status === 'approved' ? (
                    <span className="text-[11px] text-saga-success flex items-center gap-1"><CheckCircle size={11} />{t.applications.approved}</span>
                  ) : (
                    <span className="text-[11px] text-saga-dim flex items-center gap-1"><XCircle size={11} />{t.applications.rejected}</span>
                  )}
                  {app.characterDesc && (
                    <button
                      onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                      className="w-7 h-7 rounded flex items-center justify-center text-saga-dim hover:text-saga-text transition-all">
                      {expanded === app.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>
              {expanded === app.id && app.characterDesc && (
                <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[11px] text-saga-dim uppercase font-bold tracking-widest mt-2.5 mb-1">{t.applications.charDescLabel}</p>
                  <p className="text-sm text-saga-muted leading-relaxed whitespace-pre-wrap">{app.characterDesc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
