'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

interface NavItem {
  href: string
  label: string
  icon: string
}

const mainNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/characters', label: 'Meus Personagens', icon: '📋' },
]

interface SidebarProps {
  campaigns?: Array<{ id: string; name: string; emoji?: string }>
}

export function Sidebar({ campaigns = [] }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="w-[220px] min-w-[220px] h-screen bg-surface border-r border-border flex flex-col pt-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <Link href="/dashboard">
          <span className="font-cinzel text-xl font-bold tracking-[8px] text-gold-gradient cursor-pointer">
            SAGA
          </span>
        </Link>
      </div>

      {/* Main nav */}
      <div className="px-3 pt-3 flex flex-col gap-0.5">
        {mainNav.map(item => (
          <Link key={item.href} href={item.href}>
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-all cursor-pointer
              ${isActive(item.href)
                ? 'bg-gold-dim border border-gold/20 text-gold'
                : 'text-saga-muted hover:bg-surface-2 hover:text-saga-text'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="px-3 mt-3">
          <p className="text-[10px] font-bold text-saga-dim uppercase tracking-[2px] px-3 py-2">
            Minhas Campanhas
          </p>
          <div className="flex flex-col gap-0.5">
            {campaigns.map(c => (
              <Link key={c.id} href={`/campaign/${c.id}`}>
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-all cursor-pointer
                  ${isActive(`/campaign/${c.id}`)
                    ? 'bg-gold-dim border border-gold/20 text-gold'
                    : 'text-saga-muted hover:bg-surface-2 hover:text-saga-text'
                  }`}
                >
                  <span>{c.emoji ?? '🌑'}</span>
                  <span className="truncate">{c.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* User */}
      <div className="mt-auto border-t border-border p-3">
        <div className="flex items-center gap-2.5 p-2 rounded cursor-pointer hover:bg-surface-2 transition-all group">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-gold flex items-center justify-center text-sm font-bold shrink-0">
              {session?.user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-saga-text truncate">
              {session?.user?.username ?? 'Carregando...'}
            </p>
            <p className="text-[11px] text-saga-muted">@{session?.user?.name ?? 'Discord'}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="opacity-0 group-hover:opacity-100 text-saga-dim hover:text-saga-danger text-xs transition-all"
            title="Sair"
          >
            ↩
          </button>
        </div>
      </div>
    </nav>
  )
}
