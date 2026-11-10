'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Users, Ghost, CalendarDays, BookOpen } from 'lucide-react'

interface Tab {
  label: string
  href: string
  Icon: React.ElementType
  exact?: boolean
}

export function CampaignTabs({ campaignId, isGM: _isGM }: { campaignId: string; isGM: boolean }) {
  const pathname = usePathname()
  const base = `/campaign/${campaignId}`

  const tabs: Tab[] = [
    { label: 'Visão Geral', href: base,               Icon: LayoutGrid,   exact: true },
    { label: 'Membros',     href: `${base}/members`,  Icon: Users },
    { label: 'NPCs',        href: `${base}/npcs`,     Icon: Ghost },
    { label: 'Sessões',     href: `${base}/sessions`, Icon: CalendarDays },
    { label: 'Notas',       href: `${base}/notes`,    Icon: BookOpen },
  ]

  function isActive(tab: Tab) {
    return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
  }

  return (
    <div className="flex border-b border-ink/20 px-8 shrink-0 bg-parchment">
      {tabs.map(tab => (
        <Link key={tab.href} href={tab.href}>
          <button
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
              ${isActive(tab)
                ? 'text-wax border-wax font-cinzel'
                : 'text-ink-soft border-transparent hover:text-wax'
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
