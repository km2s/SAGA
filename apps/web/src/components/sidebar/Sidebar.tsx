'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'
import {
  LayoutDashboard,
  ScrollText,
  Swords,
  LogOut,
  Bot,
  ChevronRight,
  Menu,
  X,
  Library,
  HelpCircle,
} from 'lucide-react'

interface SidebarProps {
  campaigns?: Array<{ id: string; name: string }>
  discordClientId?: string
}

export function Sidebar({ campaigns = [], discordClientId }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const inviteUrl = discordClientId
    ? `https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=2147485696&scope=bot+applications.commands`
    : null

  return (
    <>
      {/* Mobile hamburger button (shows when sidebar is closed) */}
      {!mobileOpen && (
        <button
          className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-surface border border-border rounded flex items-center justify-center text-saga-muted hover:text-saga-text transition-colors shadow-lg"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
          w-[220px] min-w-[220px] h-screen bg-surface border-r border-border flex flex-col shrink-0
          fixed md:relative z-50 md:z-auto
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo + mobile close */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <span className="font-cinzel text-xl font-bold tracking-[8px] text-gold-gradient cursor-pointer">
              SAGA
            </span>
          </Link>
          <button
            className="md:hidden text-saga-dim hover:text-saga-text transition-colors"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main nav */}
        <div className="px-3 pt-3 flex flex-col gap-0.5">
          {[
            { href: '/dashboard',  label: 'Dashboard',         Icon: LayoutDashboard },
            { href: '/characters', label: 'Meus Personagens',  Icon: ScrollText },
            { href: '/systems',    label: 'Sistemas',          Icon: Library },
          ].map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-all cursor-pointer
                ${isActive(href)
                  ? 'bg-gold-dim border border-gold/20 text-gold'
                  : 'text-saga-muted hover:bg-surface-2 hover:text-saga-text'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
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
                <Link key={c.id} href={`/campaign/${c.id}`} onClick={() => setMobileOpen(false)}>
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-all cursor-pointer group
                    ${isActive(`/campaign/${c.id}`)
                      ? 'bg-gold-dim border border-gold/20 text-gold'
                      : 'text-saga-muted hover:bg-surface-2 hover:text-saga-text'
                    }`}
                  >
                    <Swords size={13} strokeWidth={1.8} className="shrink-0" />
                    <span className="truncate flex-1">{c.name}</span>
                    <ChevronRight size={11} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bot invite + Tutorial */}
        <div className={`px-3 mt-auto mb-2 flex flex-col gap-0.5`}>
          <button
            onClick={() => window.dispatchEvent(new Event('saga:open-checklist'))}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded text-sm text-saga-dim hover:text-gold hover:bg-gold-dim border border-transparent hover:border-gold/20 transition-all cursor-pointer w-full"
          >
            <HelpCircle size={15} strokeWidth={1.8} className="shrink-0" />
            <span>Primeiros Passos</span>
          </button>
          {inviteUrl && (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded text-sm text-saga-dim hover:text-gold hover:bg-gold-dim border border-transparent hover:border-gold/20 transition-all cursor-pointer"
            >
              <Bot size={15} strokeWidth={1.8} className="shrink-0" />
              <span>Convidar Bot</span>
            </a>
          )}
        </div>

        {/* User */}
        <div className="border-t border-border p-3">
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
              <p className="text-[11px] text-saga-muted">Discord</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="opacity-0 group-hover:opacity-100 text-saga-dim hover:text-saga-danger transition-all"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
