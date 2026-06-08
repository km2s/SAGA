import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

const styles: Record<Variant, string> = {
  primary:   'bg-gold text-bg font-semibold hover:bg-gold-dark',
  secondary: 'bg-surface-3 text-saga-text border border-border hover:border-border-bright',
  danger:    'bg-danger-dim text-saga-danger border border-saga-danger/30 hover:bg-saga-danger/20',
  success:   'bg-success-dim text-saga-success border border-saga-success/30',
  ghost:     'bg-transparent text-saga-muted hover:text-saga-text hover:bg-surface-2',
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
