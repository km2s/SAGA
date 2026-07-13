'use client'

import { Moon, Sun } from 'lucide-react'

/**
 * Alterna o tema pergaminho (claro) ↔ cripta (escuro). A classe `.dark` no
 * <html> é aplicada antes da hidratação por um script inline (ver RootLayout),
 * então os ícones são controlados por CSS (`dark:`) — sem mismatch nem flash.
 * A preferência persiste em localStorage('saga-theme').
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem('saga-theme', next ? 'dark' : 'light')
    } catch {
      /* localStorage indisponível — ignora */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema claro/escuro"
      className={`group relative grid h-9 w-9 place-items-center rounded-md border border-ink/15 text-ink-soft transition hover:border-gold/50 hover:text-wax ${className}`}
    >
      <Moon size={16} strokeWidth={1.8} className="block dark:hidden" />
      <Sun size={16} strokeWidth={1.8} className="hidden dark:block" />
    </button>
  )
}
