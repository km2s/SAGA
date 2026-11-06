'use client'

import { useId } from 'react'
import s from './Corvin.module.css'

/**
 * Lorde Corvin, o vampiro cronista — guia do tutorial. Porte 1:1 de
 * Saga NOVO/Corvin.dc.html. `medalhao` recorta o rosto (viewBox 80 76 120 120).
 * Os ids dos gradientes levam prefixo por instância: retrato e medalhão
 * podem estar na mesma página.
 */
export function Corvin({ variante = 'retrato', falando = false }: { variante?: 'retrato' | 'medalhao'; falando?: boolean }) {
  const p = useId().replace(/:/g, '')
  const id = (n: string) => `${p}${n}`
  const url = (n: string) => `url(#${p}${n})`
  const bat = 'M0 0 q5 -6 10 -1 q2 -3 4 0 q5 -5 10 1 q-6 1 -9 6 q-3 -3 -6 0 q-3 -5 -9 -6 z'

  return (
    <svg viewBox={variante === 'medalhao' ? '80 76 120 120' : '0 0 280 370'} preserveAspectRatio="xMidYMid slice" className={s.svg} role="img" aria-label="Lorde Corvin, o vampiro cronista">
      <defs>
        <radialGradient id={id('Bg')} cx="50%" cy="38%" r="75%"><stop offset="0" stopColor="#5a1a24" /><stop offset=".6" stopColor="#2a0c12" /><stop offset="1" stopColor="#120507" /></radialGradient>
        <radialGradient id={id('MoonG')} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffe2b0" stopOpacity=".55" /><stop offset="1" stopColor="#ffe2b0" stopOpacity="0" /></radialGradient>
        <linearGradient id={id('Skin')} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#c2b0a8" /><stop offset=".32" stopColor="#e9ddd2" /><stop offset=".58" stopColor="#efe5db" /><stop offset="1" stopColor="#bfaca4" /></linearGradient>
        <linearGradient id={id('Cape')} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#22141c" /><stop offset="1" stopColor="#070305" /></linearGradient>
        <linearGradient id={id('Lining')} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#c22a34" /><stop offset="1" stopColor="#5a0e14" /></linearGradient>
        <linearGradient id={id('Gold')} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f6dd86" /><stop offset=".5" stopColor="#c9a22a" /><stop offset="1" stopColor="#6a4c14" /></linearGradient>
        <linearGradient id={id('Rim')} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#ffa860" stopOpacity=".22" /><stop offset=".45" stopColor="#ffa860" stopOpacity="0" /></linearGradient>
        <clipPath id={id('Win')}><path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370 Z" /></clipPath>
      </defs>

      <rect x="0" y="0" width="280" height="370" fill={url('Bg')} />
      <path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370 Z" fill="#0d0407" />
      <g clipPath={url('Win')}>
        <circle cx="206" cy="80" r="52" fill={url('MoonG')} className={s.moon} />
        <circle cx="206" cy="80" r="22" fill="#f3dcae" />
        <circle cx="198" cy="74" r="4" fill="#d9bb88" opacity=".6" />
        <circle cx="212" cy="88" r="3" fill="#d9bb88" opacity=".5" />
        <g className={s.bat1}><path d={bat} fill="#1c0a10" className={s.flap1} /></g>
        <g className={s.bat2}><path d={bat} fill="#1c0a10" className={s.flap2} /></g>
        <line x1="140" y1="26" x2="140" y2="370" stroke="#c9a22a" strokeOpacity=".28" strokeWidth="2" />
        <line x1="30" y1="150" x2="250" y2="150" stroke="#c9a22a" strokeOpacity=".22" strokeWidth="2" />
      </g>
      <path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370" fill="none" stroke="#c9a22a" strokeOpacity=".45" strokeWidth="3" />

      <g className={s.breath}>
        <path d="M122 246 C94 228 64 194 46 140 C72 154 98 166 110 174 C110 200 114 226 122 246 Z" fill="#0a0507" />
        <path d="M158 246 C186 228 216 194 234 140 C208 154 182 166 170 174 C170 200 166 226 158 246 Z" fill="#0a0507" />
        <path d="M120 238 C98 222 74 194 60 156 C80 166 98 176 106 182 C107 204 112 224 120 238 Z" fill={url('Lining')} />
        <path d="M160 238 C182 222 206 194 220 156 C200 166 182 176 174 182 C173 204 168 224 160 238 Z" fill={url('Lining')} />

        <path d="M8 370 C18 310 60 268 122 252 L158 252 C220 268 262 310 272 370 Z" fill={url('Cape')} />
        <path d="M40 330 C60 300 90 280 118 268" stroke="#3a2430" strokeWidth="1.5" fill="none" opacity=".7" />
        <path d="M240 330 C220 300 190 280 162 268" stroke="#3a2430" strokeWidth="1.5" fill="none" opacity=".7" />
        <path d="M120 252 L106 370 L174 370 L160 252 Z" fill="#3a0e14" />
        <path d="M122 252 L140 312 L158 252 Z" fill="#efe6d6" />
        <path d="M122 252 L140 312 M158 252 L140 312" stroke="#1a0608" strokeWidth="2.5" fill="none" />
        <circle cx="140" cy="326" r="2.6" fill={url('Gold')} />
        <circle cx="140" cy="346" r="2.6" fill={url('Gold')} />

        <path d="M124 204 L156 204 L159 254 L121 254 Z" fill="#cdbcb2" />
        <path d="M124 208 Q140 228 156 208 L157 224 Q140 238 123 224 Z" fill="#5a2c3a" opacity=".28" />
        <path d="M128 254 Q140 270 152 254 Q148 278 140 286 Q132 278 128 254 Z" fill="#f8f1e4" stroke="#d8ccb8" strokeWidth="1" />
        <path d="M132 266 Q140 274 148 266" stroke="#d8ccb8" strokeWidth="1" fill="none" />
        <circle cx="140" cy="258" r="8.5" fill={url('Gold')} />
        <circle cx="140" cy="258" r="5" fill="#a8262f" />
        <circle cx="138.4" cy="256.4" r="1.4" fill="#ffb8b0" opacity=".8" />

        <path d="M104 150 C94 146 86 132 82 112 C94 126 102 132 107 136 Z" fill="#cdbcb2" />
        <path d="M176 150 C186 146 194 132 198 112 C186 126 178 132 173 136 Z" fill="#cdbcb2" />
        <path d="M140 90 C112 90 100 114 102 144 C104 176 120 208 140 220 C160 208 176 176 178 144 C180 114 168 90 140 90 Z" fill={url('Skin')} />
        <path d="M108 166 Q116 186 128 194" stroke="#7a4a5a" strokeOpacity=".22" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M172 166 Q164 186 152 194" stroke="#7a4a5a" strokeOpacity=".22" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M128 214 Q140 222 152 214" stroke="#fff6ec" strokeOpacity=".5" strokeWidth="2" fill="none" strokeLinecap="round" />

        <path d="M98 150 C92 108 112 74 140 72 C168 74 188 108 182 150 C178 128 172 112 162 104 C154 108 146 112 140 118 C134 112 126 108 118 104 C108 112 102 128 98 150 Z" fill="#14090c" />
        <path d="M118 88 Q140 78 164 90" stroke="#6a4a6a" strokeOpacity=".55" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M106 118 Q112 98 128 88" stroke="#6a4a6a" strokeOpacity=".45" strokeWidth="1.6" fill="none" strokeLinecap="round" />

        <g className={s.brow}>
          <path d="M110 135 Q122 127 134 139" stroke="#14090c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M170 135 Q158 127 146 139" stroke="#14090c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </g>
        <path d="M114 152 Q123 156 132 152" stroke="#6a3a5a" strokeOpacity=".35" strokeWidth="1.6" fill="none" />
        <path d="M148 152 Q157 156 166 152" stroke="#6a3a5a" strokeOpacity=".35" strokeWidth="1.6" fill="none" />
        <path d="M114 146 Q123 139.5 132 146 Q123 151 114 146 Z" fill="#f6eee0" />
        <path d="M148 146 Q157 139.5 166 146 Q157 151 148 146 Z" fill="#f6eee0" />
        <circle cx="124" cy="146" r="6" fill="#ff3a3a" className={s.glow} />
        <circle cx="156" cy="146" r="6" fill="#ff3a3a" className={s.glow} />
        <circle cx="124" cy="146" r="3.3" fill="#c8242c" />
        <circle cx="156" cy="146" r="3.3" fill="#c8242c" />
        <circle cx="124" cy="146" r="1.3" fill="#2a0508" />
        <circle cx="156" cy="146" r="1.3" fill="#2a0508" />
        <circle cx="125.2" cy="144.8" r=".9" fill="#fff" />
        <circle cx="157.2" cy="144.8" r=".9" fill="#fff" />
        <ellipse cx="123" cy="145.5" rx="10.5" ry="7" fill="#e3d6ca" className={s.blink} />
        <ellipse cx="157" cy="145.5" rx="10.5" ry="7" fill="#e3d6ca" className={s.blink} />

        <path d="M140 148 L136 177 Q140 181 144 177" stroke="#a8968c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <g className={`${s.mouth} ${falando ? s.talking : ''}`}><path d="M129 193 Q140 206 151 193 Q140 197 129 193 Z" fill="#3a0a0e" /></g>
        <path d="M126 192 Q140 199 154 192" stroke="#5a1418" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M131.5 193.6 L133.6 202 L136 194.8 Z" fill="#fbf6ee" />
        <path d="M148.5 193.6 L146.4 202 L144 194.8 Z" fill="#fbf6ee" />
      </g>

      <g transform="translate(198 232)">
        <g className={s.breath}>
          <path d="M0 30 C0 12 14 2 28 6 C40 10 46 24 40 38 L56 60 L34 46 C22 52 4 46 0 30 Z" fill="#0b0709" className={s.wing} />
          <path d="M6 30 C12 20 26 16 36 24" stroke="#3a2a40" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M10 36 C16 30 26 28 34 32" stroke="#3a2a40" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M14 46 l-2 9 M22 48 l0 9" stroke="#c9a22a" strokeWidth="2" strokeLinecap="round" />
          <g className={s.raven}>
            <circle cx="24" cy="4" r="11.5" fill="#0b0709" />
            <path d="M33 0 L49 5 L33 10 Z" fill="#2e2a30" />
            <path d="M33 5 L49 5" stroke="#0b0709" strokeWidth="1" />
            <circle cx="27" cy="1" r="2.2" fill="#e8c46a" />
            <circle cx="27.6" cy=".4" r=".7" fill="#fff" />
          </g>
        </g>
      </g>

      <rect x="0" y="0" width="280" height="370" fill={url('Rim')} style={{ pointerEvents: 'none' }} />
    </svg>
  )
}
