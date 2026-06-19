'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  X, Swords, Sparkles,
} from 'lucide-react'
import { CreateCampaignModal } from '@/components/campaign/CreateCampaignModal'
import { useLocale } from '@/lib/i18n/context'

const KEY_DISMISSED   = 'saga_checklist_dismissed'
const KEY_VISITED_GM  = 'saga_visited_gm'
const KEY_VISITED_NPC = 'saga_visited_npc'
const KEY_VISITED_MESA= 'saga_visited_mesa'

interface Props {
  hasCampaign: boolean
  firstCampaignId: string | null
  firstGMCampaignId: string | null
}

export function OnboardingChecklist({ hasCampaign, firstCampaignId, firstGMCampaignId }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const { t }    = useLocale()
  const [mounted, setMounted]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [minimized, setMinimized]     = useState(false)
  const [createOpen, setCreateOpen]   = useState(false)
  const [visitedGm, setVisitedGm]     = useState(false)
  const [visitedNpc, setVisitedNpc]   = useState(false)
  const [visitedMesa, setVisitedMesa] = useState(false)

  useEffect(() => {
    setMounted(true)
    const dismissed = localStorage.getItem(KEY_DISMISSED) === 'true'
    setVisitedGm(localStorage.getItem(KEY_VISITED_GM) === 'true')
    setVisitedNpc(localStorage.getItem(KEY_VISITED_NPC) === 'true')
    setVisitedMesa(localStorage.getItem(KEY_VISITED_MESA) === 'true')

    if (!dismissed) setOpen(true)

    function handleReopen() {
      localStorage.removeItem(KEY_DISMISSED)
      setOpen(true)
      setMinimized(false)
    }
    window.addEventListener('saga:open-checklist', handleReopen)
    return () => window.removeEventListener('saga:open-checklist', handleReopen)
  }, [])

  // Re-read localStorage whenever the route changes (Next.js navigation)
  useEffect(() => {
    if (!mounted) return
    setVisitedGm(localStorage.getItem(KEY_VISITED_GM) === 'true')
    setVisitedNpc(localStorage.getItem(KEY_VISITED_NPC) === 'true')
    setVisitedMesa(localStorage.getItem(KEY_VISITED_MESA) === 'true')
  }, [pathname, mounted])

  if (!mounted) return null

  function dismiss() {
    localStorage.setItem(KEY_DISMISSED, 'true')
    setOpen(false)
  }

  const tasks = [
    {
      id: 'account',
      label: t.onboarding.taskAccount,
      sublabel: t.onboarding.taskAccountSub,
      done: true,
      action: null as (() => void) | null,
    },
    {
      id: 'campaign',
      label: t.onboarding.taskCampaign,
      sublabel: t.onboarding.taskCampaignSub,
      done: hasCampaign,
      action: hasCampaign ? null : (() => setCreateOpen(true)),
    },
    {
      id: 'gm',
      label: t.onboarding.taskGm,
      sublabel: t.onboarding.taskGmSub,
      done: visitedGm,
      action: firstGMCampaignId
        ? (() => router.push(`/campaign/${firstGMCampaignId}/gm`))
        : null,
    },
    {
      id: 'npc',
      label: t.onboarding.taskNpc,
      sublabel: t.onboarding.taskNpcSub,
      done: visitedNpc,
      action: firstGMCampaignId
        ? (() => router.push(`/campaign/${firstGMCampaignId}/npcs`))
        : null,
    },
    {
      id: 'mesa',
      label: t.onboarding.taskMesa,
      sublabel: t.onboarding.taskMesaSub,
      done: visitedMesa,
      action: firstCampaignId
        ? (() => router.push(`/campaign/${firstCampaignId}/mesa`))
        : null,
    },
  ]

  const done  = tasks.filter(t => t.done).length
  const total = tasks.length
  const allDone = done === total
  const pct = (done / total) * 100

  if (!open) return null

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 w-[300px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">

        {/* Top accent */}
        <div className="h-0.5 bg-gradient-to-r from-purple via-gold to-purple" />

        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2">
          <Swords size={14} className="text-gold shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-cinzel text-[13px] font-semibold leading-none">{t.onboarding.title}</p>
            <p className="text-[10px] text-saga-muted mt-0.5">{done} {t.onboarding.completed} {total} {t.onboarding.completedSuffix}</p>
          </div>
          <button
            onClick={() => setMinimized(m => !m)}
            className="p-1 rounded text-saga-dim hover:text-saga-text transition-colors"
          >
            {minimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={dismiss}
            className="p-1 rounded text-saga-dim hover:text-saga-danger transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-2 mx-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Task list */}
        {!minimized && (
          <div className="p-3 pt-2">
            {allDone ? (
              <div className="py-5 flex flex-col items-center gap-2 text-center">
                <Sparkles size={24} className="text-gold" />
                <p className="font-cinzel text-sm font-bold text-gold">{t.onboarding.allDoneTitle}</p>
                <p className="text-[11px] text-saga-muted">{t.onboarding.allDoneDesc}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {tasks.map(task => {
                  const clickable = !task.done && !!task.action
                  return (
                    <button
                      key={task.id}
                      disabled={task.done || !task.action}
                      onClick={task.action ?? undefined}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left w-full transition-all
                        ${clickable ? 'hover:bg-surface-2 cursor-pointer group' : 'cursor-default'}`}
                    >
                      {task.done ? (
                        <CheckCircle2 size={16} className="text-saga-success shrink-0 mt-0.5" />
                      ) : (
                        <Circle size={16} className={`shrink-0 mt-0.5 transition-colors ${clickable ? 'text-saga-dim group-hover:text-gold' : 'text-saga-dim/40'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug transition-colors ${
                          task.done
                            ? 'text-saga-dim line-through'
                            : clickable
                            ? 'text-saga-text group-hover:text-gold'
                            : 'text-saga-dim'
                        }`}>
                          {task.label}
                        </p>
                        {!task.done && (
                          <p className="text-[10px] text-saga-dim mt-0.5 leading-snug">{task.sublabel}</p>
                        )}
                      </div>
                      {clickable && (
                        <span className="text-[10px] text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                          →
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
