'use client'

import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import s from './ui.module.css'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'blood' | 'discord'

/** Botões do redesign. Altura/padding padrão 38px/14px — sobrescreva por className/style quando a tela usar outro tamanho. */
export function Button({ variant = 'primary', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type="button" {...rest} className={cx(s.btn, s[variant], className)} />
}

export function Card({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return <div className={cx(s.card, className)} style={style}>{children}</div>
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(s.input, className)} />
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={s.seg}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cx(s.segOpt, o.value === value && s.segOn)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Chip({ on, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button type="button" {...rest} className={cx(s.chip, on && s.chipOn, className)} />
}

export function Switch({ on, onChange, label = 'Alternar' }: { on: boolean; onChange: (on: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx(s.switch, on && s.switchOn)}>
      <span />
    </button>
  )
}

export function Stepper({ value, onDec, onInc }: { value: ReactNode; onDec: () => void; onInc: () => void }) {
  return (
    <div className={s.stepper}>
      <button type="button" aria-label="Diminuir" onClick={onDec} className={s.stepBtn}>−</button>
      <span className={s.stepVal}>{value}</span>
      <button type="button" aria-label="Aumentar" onClick={onInc} className={s.stepBtn}>+</button>
    </div>
  )
}

export function Ribbon({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return <span className={cx(s.ribbon, className)} style={style}>{children}</span>
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className={s.kicker}><span>❦</span>{children}</p>
}

/** d20 inline do design (pentágono + triângulo interno). */
export function D20({ size, color = 'currentColor', stroke = 8 }: { size: number; color?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <polygon points="50,7 91,34 76,85 24,85 9,34" fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <polygon points="27,34 73,34 50,76" fill={color} stroke={color} strokeWidth={5} strokeLinejoin="round" />
    </svg>
  )
}

/** Selo do logo + "Saga". Header: 32/17/28. Login: 34/18/30. */
export function Logo({ seal = 32, die = 17, word = 28 }: { seal?: number; die?: number; word?: number }) {
  return (
    <>
      <span className={s.logoSeal} style={{ width: seal, height: seal }}><D20 size={die} color="#f6e7c4" /></span>
      <span className={s.logoWord} style={{ fontSize: word }}>Saga</span>
    </>
  )
}

/** Selo de cera de confirmação, com a animação `stamp`. */
export function WaxSeal({ size = 104, letter = 'S', stamp = true, className, style }: { size?: number; letter?: ReactNode; stamp?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx(s.waxSeal, stamp && s.stamp, className)} style={{ width: size, height: size, fontSize: size / 2, ...style }}>{letter}</span>
  )
}

/**
 * <image-slot> do design: imagem enviada pelo usuário cobrindo o slot. Sem
 * imagem não renderiza nada e aparece o gradiente que está atrás.
 */
export function ImageSlot({ src, alt = '' }: { src: string | null | undefined; alt?: string }) {
  if (!src) return null
  // eslint-disable-next-line @next/next/no-img-element -- URLs de usuário, de qualquer host
  return <img src={src} alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
}

/** Ícone escolhido em tempo de execução (no design, máscara com url dinâmica). */
export function DynIcon({ icon: Icon, ...rest }: { icon: LucideIcon | null | undefined } & LucideProps) {
  return Icon ? <Icon {...rest} /> : null
}

export function DiscordIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

export function GoogleIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}
