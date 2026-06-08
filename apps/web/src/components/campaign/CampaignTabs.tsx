'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  label: string
  href: string
  exact?: boolean
}

export function CampaignTabs({ campaignId, isGM }: { campaignId: string; isGM: boolean }) {
  const pathname = usePathname()
  const base = `/campaign/${campaignId}`

  const tabs: Tab[] = [
    { label: 'Visão Geral', href: base, exact: true },
    { label: 'Membros',     href: `${base}/members` },
    { label: 'NPCs',        href: `${base}/npcs` },
    { label: 'Sessões',     href: `${base}/sessions` },
    { label: 'Notas',       href: `${base}/notes` },
  ]

  function isActive(tab: Tab) {
    return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
  }

  return (
    <div className="flex border-b border-border px-8 shrink-0 bg-bg">
      {tabs.map(tab => (
        <Link key={tab.href} href={tab.href}>
          <button
            className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
              ${isActive(tab)
                ? 'text-gold border-gold'
                : 'text-saga-muted border-transparent hover:text-saga-text'
              }`}
          >
            {tab.label}
          </button>
        </Link>
      ))}
    </div>
  )
}
