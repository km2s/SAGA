'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Users, Ghost, CalendarDays, BookOpen } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

interface Tab {
  label: string
  href: string
  Icon: React.ElementType
  exact?: boolean
}

export function CampaignTabs({ campaignId, isGM: _isGM }: { campaignId: string; isGM: boolean }) {
  const pathname = usePathname()
  const { t } = useLocale()
  const base = `/campaign/${campaignId}`

  const tabs: Tab[] = [
    { label: t.campaignTabs.overview,  href: base,               Icon: LayoutGrid,   exact: true },
    { label: t.campaignTabs.members,   href: `${base}/members`,  Icon: Users },
    { label: t.campaignTabs.npcs,      href: `${base}/npcs`,     Icon: Ghost },
    { label: t.campaignTabs.sessions,  href: `${base}/sessions`, Icon: CalendarDays },
    { label: t.campaignTabs.notes,     href: `${base}/notes`,    Icon: BookOpen },
  ]

  function isActive(tab: Tab) {
    return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
  }

  return (
    <div className="flex border-b border-border px-8 shrink-0 bg-bg">
      {tabs.map(tab => (
        <Link key={tab.href} href={tab.href}>
          <button
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
              ${isActive(tab)
                ? 'text-gold border-gold'
                : 'text-saga-muted border-transparent hover:text-saga-text'
              }`}
          >
            <tab.Icon size={14} strokeWidth={1.8} />
            {tab.label}
          </button>
        </Link>
      ))}
    </div>
  )
}
