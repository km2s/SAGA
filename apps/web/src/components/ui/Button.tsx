import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

const styles: Record<Variant, string> = {
  primary:   'bg-wax text-parchment font-semibold shadow-sm hover:bg-wax-deep',
  secondary: 'bg-parchment/70 text-ink border border-ink/25 hover:border-wax hover:text-wax',
  danger:    'bg-wax/10 text-wax border border-wax/40 hover:bg-wax/20',
  success:   'bg-green-700/10 text-green-800 border border-green-700/30 hover:bg-green-700/20',
  ghost:     'bg-transparent text-ink-soft hover:text-ink hover:bg-ink/5',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
