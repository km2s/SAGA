'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useState, type CSSProperties } from 'react'
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
  Moon,
  Sun,
} from 'lucide-react'
import { Crest, Fleuron } from '@/components/landing/Ornament'

interface SidebarProps {
  campaigns?: Array<{ id: string; name: string }>
  discordClientId?: string
}

// Fundo pergaminho da barra lateral "Codex Magistri" — funde-se com o conteúdo
const codexStyle: CSSProperties = {
  backgroundColor: 'rgb(var(--parchment))',
  boxShadow: 'inset -1px 0 0 rgb(var(--ink) / 0.10)',
}

export function Sidebar({ campaigns = [], discordClientId }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  function toggleTheme() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem('saga-theme', next ? 'dark' : 'light')
    } catch {
      /* localStorage indisponível — ignora */
    }
  }

  const inviteUrl = discordClientId
    ? `https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=2147485696&scope=bot+applications.commands`
    : null

  return (
    <>
      {/* Botão hambúrguer mobile */}
      {!mobileOpen && (
        <button
          className="wax-seal md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded flex items-center justify-center text-parchment shadow-lg"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/40 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        // Havia um `relative` solto junto de `fixed md:relative`: como o Tailwind
        // emite `.relative` depois de `.fixed`, o `relative` vencia e a barra
        // continuava ocupando 230px do fluxo mesmo fechada no celular — o
        // conteúdo ficava com 145px de largura em uma tela de 375px.
        className={`
          w-[230px] min-w-[230px] h-screen flex flex-col shrink-0 text-ink
          fixed md:relative z-50 md:z-auto
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={codexStyle}
      >
        {/* filetes dourados tracejados na borda direita */}
        <div className="pointer-events-none absolute inset-y-3 right-2 w-px border-r border-dashed border-gold/40" />
        <div className="pointer-events-none absolute inset-y-3 right-3 w-px border-r border-dashed border-gold/25" />

        {/* Logo + fechar mobile */}
        <div className="px-5 py-6 border-b border-ink/15 text-center relative">
          <button
            className="md:hidden absolute top-3 right-3 text-ink-soft hover:text-ink transition-colors"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block">
            <Crest className="h-11 w-11 mx-auto" />
            <div className="font-cinzel text-2xl font-bold tracking-[0.35em] gold-text mt-2">SAGA</div>
            <div className="text-[10px] uppercase tracking-[4px] text-wax/70 mt-1 italic font-cormorant">
              Codex Magistri
            </div>
          </Link>
          <Fleuron className="mx-auto mt-3 text-gold/70" />
        </div>

        {/* Nav principal */}
        <div className="px-4 pt-5 flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[3px] text-wax/60 px-3 mb-1"><Fleuron className="h-1.5 w-auto" /> Câmaras</p>
          {[
            { href: '/dashboard', label: 'Salão', Icon: LayoutDashboard },
            { href: '/characters', label: 'Meus Bravos', Icon: ScrollText },
            { href: '/systems', label: 'Códices', Icon: Library },
          ].map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
              <div
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-cinzel uppercase tracking-[0.15em] transition ${
                  isActive(href)
                    ? 'bg-wax/10 text-wax'
                    : 'text-ink-soft hover:text-wax hover:bg-ink/5'
                }`}
              >
                {isActive(href) && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-wax shadow-[0_0_8px_rgba(143,58,36,0.4)]" />
                )}
                <Icon size={15} strokeWidth={1.8} className="shrink-0" />
                {label}
              </div>
            </Link>
          ))}
        </div>

        {/* Campanhas */}
        {campaigns.length > 0 && (
          <div className="px-4 mt-4">
            <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[3px] text-wax/60 px-3 mb-1"><Fleuron className="h-1.5 w-auto" /> Crônicas</p>
            <div className="flex flex-col gap-1">
              {campaigns.map(c => (
                <Link key={c.id} href={`/campaign/${c.id}`} onClick={() => setMobileOpen(false)}>
                  <div
                    className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-cormorant transition ${
                      isActive(`/campaign/${c.id}`)
                        ? 'bg-wax/10 text-wax'
                        : 'text-ink-soft hover:text-wax hover:bg-ink/5'
                    }`}
                  >
                    {isActive(`/campaign/${c.id}`) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-wax shadow-[0_0_8px_rgba(143,58,36,0.4)]" />
                    )}
                    <Swords size={13} strokeWidth={1.8} className="shrink-0" />
                    <span className="truncate flex-1">{c.name}</span>
                    <ChevronRight size={11} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bot invite + Tutorial + Tema */}
        <div className="px-4 mt-auto mb-2 flex flex-col gap-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-cormorant text-ink-soft hover:text-wax hover:bg-ink/5 transition cursor-pointer w-full"
          >
            <Moon size={15} strokeWidth={1.8} className="shrink-0 block dark:hidden" />
            <Sun size={15} strokeWidth={1.8} className="shrink-0 hidden dark:block" />
            <span className="block dark:hidden">Modo Cripta</span>
            <span className="hidden dark:block">Modo Pergaminho</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('saga:open-checklist'))}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-cormorant text-ink-soft hover:text-wax hover:bg-ink/5 transition cursor-pointer w-full"
          >
            <HelpCircle size={15} strokeWidth={1.8} className="shrink-0" />
            <span>Primeiros Passos</span>
          </button>
          {inviteUrl && (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-cormorant text-ink-soft hover:text-wax hover:bg-ink/5 transition cursor-pointer"
            >
              <Bot size={15} strokeWidth={1.8} className="shrink-0" />
              <span>Convidar Bot</span>
            </a>
          )}
        </div>

        {/* Usuário */}
        <div className="border-t border-ink/15 p-4">
          <div className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-ink/5 transition group">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt="avatar"
                width={36}
                height={36}
                className="rounded-full border border-gold/50"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-wax grid place-items-center text-sm font-cinzel text-ink border border-gold/60 shrink-0">
                {session?.user?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-sm font-cinzel tracking-wide text-wax truncate">
                {session?.user?.username ?? 'Carregando...'}
              </p>
              <p className="text-[10px] uppercase tracking-[2px] text-ink-soft">Discord</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-ember transition-all shrink-0 w-9 h-9 -mr-1 flex items-center justify-center rounded"
              title="Sair"
              aria-label="Sair da conta"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
