import type { ReactNode } from 'react'

export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <span className="h-px w-24 bg-gradient-to-r from-transparent via-ink/40 to-transparent" />
      <Fleuron className="text-wax" />
      <span className="h-px w-24 bg-gradient-to-r from-transparent via-ink/40 to-transparent" />
    </div>
  )
}

export function Fleuron({ className = '' }: { className?: string }) {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M16 2c2 3 5 5 8 5-3 0-6 2-8 5-2-3-5-5-8-5 3 0 6-2 8-5zM2 10h28v.5c-3 0-5 1-7 2-2-1-4-2-7-2-3 0-5 1-7 2-2-1-4-2-7-2V10z"
        opacity="0.85"
      />
    </svg>
  )
}

/** Eyebrow de seção — texto com fleurões (ornamento SVG) nos flancos, herdando a cor. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-2.5 ${className}`}>
      <Fleuron className="h-2.5 w-auto opacity-80" />
      <span>{children}</span>
      <Fleuron className="h-2.5 w-auto opacity-80" />
    </p>
  )
}

export function Crest({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="crestG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#dcb356" />
          <stop offset="1" stopColor="#9c7226" />
        </linearGradient>
      </defs>
      <path
        d="M32 4l24 8v18c0 14-10 24-24 30C18 54 8 44 8 30V12l24-8z"
        fill="url(#crestG)"
        stroke="rgb(var(--wax-deep))"
        strokeWidth="1.5"
      />
      <path
        d="M32 16l3 9h9l-7.5 5.5L40 40l-8-5.5L24 40l3.5-9.5L20 25h9l3-9z"
        fill="rgb(var(--wax-deep))"
      />
    </svg>
  )
}

/** Filigrana de canto — fica em qualquer canto de uma moldura */
export function Filigree({ className = '', flip = '' }: { className?: string; flip?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className={`absolute h-12 w-12 text-gold ${flip} ${className}`}
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M4 4 L24 4 M4 4 L4 24" />
        <path d="M4 4 L20 20" opacity="0.5" />
        <path d="M10 4 Q22 4 22 14 Q22 22 14 22 Q6 22 8 14" />
        <circle cx="22" cy="22" r="1.6" fill="currentColor" />
        <path d="M4 28 Q14 28 14 36 M28 4 Q28 14 36 14" opacity="0.7" />
        <path d="M4 14 Q10 16 12 12" opacity="0.6" />
      </g>
    </svg>
  )
}

/** Título de seção com faixa heráldica + divisória */
export function SectionHeader({
  eyebrow,
  title,
  italic,
}: {
  eyebrow: string
  title: string
  italic?: string
}) {
  return (
    <div className="text-center">
      <span className="banner-heading text-xs">{eyebrow}</span>
      <h2 className="mt-6 font-cinzel text-4xl font-bold text-ink md:text-5xl">
        {title}
        {italic && (
          <>
            <br />
            <span className="italic gold-text">{italic}</span>
          </>
        )}
      </h2>
      <Divider className="mt-6" />
    </div>
  )
}

/** Moldura ornamentada com filigranas nos quatro cantos */
export function OrnateFrame({
  children,
  className = '',
  innerClassName = '',
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
}) {
  return (
    <div className={`ornate-frame relative rounded-lg ${className}`}>
      <Filigree className="top-1 left-1" />
      <Filigree className="top-1 right-1" flip="rotate-90" />
      <Filigree className="bottom-1 left-1" flip="-rotate-90" />
      <Filigree className="bottom-1 right-1" flip="rotate-180" />
      <div className={`relative ${innerClassName}`}>{children}</div>
    </div>
  )
}
