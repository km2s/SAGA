import { type ReactNode } from 'react'

type Variant = 'gold' | 'purple' | 'success' | 'danger' | 'muted'

const styles: Record<Variant, string> = {
  gold:    'bg-gold/15 border border-gold/40 text-gold-deep',
  purple:  'bg-purple/10 border border-purple/40 text-purple',
  success: 'bg-green-700/10 border border-green-700/30 text-green-800',
  danger:  'bg-wax/10 border border-wax/30 text-wax',
  muted:   'bg-ink/5 border border-ink/15 text-ink-soft',
}

export function Badge({ children, variant = 'muted' }: { children: ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}
