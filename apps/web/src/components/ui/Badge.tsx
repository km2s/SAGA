import { type ReactNode } from 'react'

type Variant = 'gold' | 'purple' | 'success' | 'danger' | 'muted'

const styles: Record<Variant, string> = {
  gold:    'bg-gold-dim border border-gold-dim text-gold',
  purple:  'bg-purple-dim border border-purple/30 text-purple-bright',
  success: 'bg-success-dim border border-saga-success/25 text-saga-success',
  danger:  'bg-danger-dim border border-saga-danger/25 text-saga-danger',
  muted:   'bg-surface-3 border border-border text-saga-muted',
}

export function Badge({ children, variant = 'muted' }: { children: ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}
