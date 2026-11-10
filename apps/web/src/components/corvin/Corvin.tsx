'use client'

import { useId } from 'react'
import './corvin.css'

/*
 * Lorde Corvin, o vampiro cronista (guia do tutorial), em gravura de nanquim.
 * Gerado por scripts/corvin-jsx.js a partir de Saga NOVO/Corvin.dc.html: não edite à mão.
 * `medalhao` recorta o rosto (viewBox 80 76 120 120); os ids levam um sufixo por
 * instância porque retrato e medalhão podem estar na mesma página.
 */
export function Corvin({ variante = 'retrato', falando = false }: { variante?: 'retrato' | 'medalhao'; falando?: boolean }) {
  const u = useId().replace(/:/g, '')
  const med = variante === 'medalhao'
  const vb = med ? '80 76 120 120' : '0 0 280 370'
  const modeClass = med ? 'cv-med' : 'cv-ret'
  const figT = med ? 'translate(140 136) scale(.66) translate(-140 -146)' : 'translate(0 0)'
  const clip = med ? `url(#cvMed-${u})` : 'none'
  const tex = med ? 'none' : `url(#cvPaper-${u})`
  const mouthOpen = falando ? 1 : 0.18
  const mouthAnim = falando ? 'corvTalk .26s ease-in-out infinite' : 'none'
  return (
    <svg viewBox={`${vb}`} preserveAspectRatio="xMidYMid slice" className={`cv-svg ${modeClass}`} style={{ display: "block", width: "100%", height: "100%" }} role="img" aria-label="Lorde Corvin, o vampiro cronista">
  <defs>
    <pattern id={`cvHatch-${u}`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 -1 V4" stroke="#1a0e0a" strokeWidth=".7"></path></pattern>
    <pattern id={`cvHatchW-${u}`} width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-56)"><path d="M0 -1 V5" stroke="#0a0605" strokeWidth=".9"></path></pattern>
    <filter id={`cvPaper-${u}`} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.15 .9" numOctaves="2" seed="11" result="n"></feTurbulence>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.12 0 0 0 1.02" result="a"></feColorMatrix>
      <feComposite in="SourceGraphic" in2="a" operator="in"></feComposite>
    </filter>
    <clipPath id={`cvWin-${u}`}><path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370 Z"></path></clipPath>
    <clipPath id={`cvMed-${u}`}><circle cx="140" cy="136" r="56"></circle></clipPath>
  </defs>

  <g className="cv-scene">
    <g filter={`${tex}`}>
      <rect x="0" y="0" width="280" height="370" fill="#1c0f0f"></rect>
      <path d="M6 370 V160 Q6 42 140 3 Q274 42 274 160 V370 Z" fill="#2a0e12"></path>
      <path d="M18 370 V160 Q18 51 140 14 Q262 51 262 160 V370 Z" fill="#3a0e14"></path>
    </g>
    <path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370 Z" fill="#2e1419"></path>
    <g clipPath={`url(#cvWin-${u})`}>
      <path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370 Z M50 370 V168 Q50 86 140 56 Q230 86 230 168 V370 Z" fill="#241016" fillRule="evenodd"></path>
      <g style={{ animation: "corvMoon 6s ease-in-out infinite" }}>
        <circle cx="206" cy="80" r="50" fill="#f3dcae" opacity=".08"></circle>
        <circle cx="206" cy="80" r="35" fill="#f3dcae" opacity=".1"></circle>
      </g>
      <circle cx="206" cy="80" r="22" fill="#f3dcae" stroke="#1a0e0a" strokeWidth="1.4"></circle>
      <circle cx="197" cy="75" r="4.2" stroke="#9c7e56" strokeWidth="1" fill="none"></circle>
      <circle cx="211" cy="89.5" r="2.9" stroke="#9c7e56" strokeWidth=".9" fill="none"></circle>
      <circle cx="214.5" cy="71" r="1.7" stroke="#9c7e56" strokeWidth=".8" fill="none"></circle>
      <path d="M187 86 l3 -2 M188.5 90 l3.5 -2.4 M191 94 l3.6 -2.4" className="cv-fine" stroke="#9c7e56" strokeWidth=".7" strokeLinecap="round"></path>
      <g style={{ animation: "corvBat 11s linear infinite" }}><path d="M0 0 q5 -6 10 -1 q2 -3 4 0 q5 -5 10 1 q-6 1 -9 6 q-3 -3 -6 0 q-3 -5 -9 -6 z" fill="#1a0e0a" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "corvFlap .32s ease-in-out infinite" }}></path></g>
      <g style={{ animation: "corvBat2 15s 4s linear infinite" }}><path d="M0 0 q5 -6 10 -1 q2 -3 4 0 q5 -5 10 1 q-6 1 -9 6 q-3 -3 -6 0 q-3 -5 -9 -6 z" fill="#1a0e0a" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "corvFlap .28s ease-in-out infinite" }}></path></g>
      <path d="M140 26 V370 M30 150 H250" stroke="#c9a22a" strokeOpacity=".55" strokeWidth=".9" fill="none"></path>
    </g>
    <path d="M30 370 V160 Q30 60 140 26 Q250 60 250 160 V370" fill="none" stroke="#c9a22a" strokeWidth="2"></path>
    <path d="M35 370 V160 Q35 64 140 31.6 Q245 64 245 160 V370" fill="none" stroke="#c9a22a" strokeWidth=".75"></path>
  </g>

  <g className="cv-medal">
    <circle cx="140" cy="136" r="57" fill="#2a0e12"></circle>
    <circle cx="140" cy="126" r="44" fill="#3a0e14"></circle>
  </g>

  <g clipPath={`${clip}`}><g transform={`${figT}`}>
  <g style={{ animation: "corvBreath 5s ease-in-out infinite" }}>
    
    <g filter={`${tex}`}>
      <path d="M121 248 C96 230 70 192 60 130 C78 148 96 162 108 172 C108 198 112 226 121 248 Z" fill="#241c14"></path>
      <path d="M159 248 C184 230 210 190 221 126 C204 145 186 160 172 172 C172 198 168 226 159 248 Z" fill="#241c14"></path>
      <path d="M119 240 C100 224 79 194 68 145 C84 159 98 169 106 177 C106 202 110 224 119 240 Z" fill="#8a1c24"></path>
      <path d="M161 240 C180 224 202 194 213 141 C197 157 182 168 174 177 C174 202 170 224 161 240 Z" fill="#5a1015"></path>
      <path d="M119 240 C108 230 98 214 90 194 C98 202 104 206 107 208 C108 222 112 232 119 240 Z" fill="#5a1015"></path>
      <path d="M213 141 C206 170 194 196 180 214 C186 196 194 172 200 154 Z" fill="#8a1c24"></path>
    </g>
    <path d="M121 248 C96 230 70 192 60 130 C78 148 96 162 108 172 C108 198 112 226 121 248 Z" className="o" fill="none"></path>
    <path d="M159 248 C184 230 210 190 221 126 C204 145 186 160 172 172 C172 198 168 226 159 248 Z" className="o" fill="none"></path>
    <path d="M119 240 C100 224 79 194 68 145 C84 159 98 169 106 177" className="f" fill="none"></path>
    <path d="M161 240 C180 224 202 194 213 141 C197 157 182 168 174 177" className="f" fill="none"></path>
    <path d="M106 177 C106 202 110 224 119 240 C104 226 96 210 100 190 Z" className="cv-fine" fill={`url(#cvHatch-${u})`} opacity=".38"></path>
    <path d="M174 177 C174 202 170 224 161 240 C178 226 186 206 184 186 Z" className="cv-fine" fill={`url(#cvHatch-${u})`} opacity=".4"></path>
    <path d="M219 134 C210 186 186 226 163 244" className="cv-fine" stroke="#efe4d2" strokeOpacity=".32" strokeWidth="1.1" fill="none" strokeLinecap="round"></path>

    
    <g filter={`${tex}`}>
      <path d="M8 370 C18 310 60 268 122 252 L158 252 C220 268 262 310 272 370 Z" fill="#241c14"></path>
      <path d="M8 370 C18 310 60 268 122 252 L114 298 C92 310 74 336 66 370 Z" fill="#140c0a"></path>
      <path d="M194 288 C210 310 222 338 228 370 L242 370 C232 334 214 304 194 288 Z" fill="#140c0a"></path>
      <path d="M150 300 C162 320 168 346 168 370 L176 370 C176 344 166 318 150 300 Z" fill="#140c0a"></path>
    </g>
    <path d="M66 370 C74 336 92 310 114 298 L110 326 C98 336 90 352 86 370 Z" className="cv-fine" fill={`url(#cvHatchW-${u})`} opacity=".55"></path>
    <path d="M8 370 C18 310 60 268 122 252 L158 252 C220 268 262 310 272 370" className="o" fill="none"></path>
    <path d="M166 256 C214 270 248 302 262 344" className="cv-fine" stroke="#efe4d2" strokeOpacity=".28" strokeWidth="1.2" fill="none" strokeLinecap="round"></path>
    <path d="M40 332 C58 304 84 286 110 274" className="cv-fine" stroke="#3a2c26" strokeWidth="1.2" fill="none" strokeLinecap="round"></path>

    
    <path d="M120 252 L106 370 L174 370 L160 252 Z" fill="#5a1015" className="m"></path>
    <path d="M122 252 L140 312 L158 252 Z" fill="#f6efe2" className="f"></path>
    <path d="M121.5 252 L140 313 L158.5 252" className="m" fill="none"></path>
    <circle cx="140" cy="328" r="2.8" fill="#c9a22a" className="f"></circle>
    <circle cx="140" cy="348" r="2.8" fill="#c9a22a" className="f"></circle>
    <circle cx="139.2" cy="327.2" r=".9" fill="#f3dc94"></circle>
    <circle cx="139.2" cy="347.2" r=".9" fill="#f3dc94"></circle>

    
    <path d="M124 204 L156 204 L159 254 L121 254 Z" fill="#cdbcae" filter={`${tex}`}></path>
    <path d="M125 212 L121.5 253 M155 212 L158.5 253" className="m" fill="none"></path>
    <path d="M124 207 Q140 230 156 207 L157 224 Q140 240 123 224 Z" className="cv-fine" fill={`url(#cvHatch-${u})`} opacity=".42"></path>
    <path d="M131 228 L129.4 250 M149.6 228 L151 250" className="cv-fine" stroke="#1a0e0a" strokeOpacity=".45" strokeWidth=".8" fill="none" strokeLinecap="round"></path>

    
    <path d="M127 254 Q133 262 140 262 Q147 262 153 254 Q154 266 149.5 272 Q152 279 144.5 284 Q140 290 135.5 284 Q128 279 130.5 272 Q126 266 127 254 Z" fill="#f6efe2" className="f"></path>
    <path d="M132.5 268.5 Q140 275 147.5 268.5 M135.5 278.5 Q140 282 144.5 278.5" className="f" fill="none"></path>
    <path d="M128 256 Q129 266 132 271 Q129 278 135 284 L137 280 Q133 276 134.5 271 Q131 266 131 260 Z" className="cv-fine" fill={`url(#cvHatch-${u})`} opacity=".35"></path>

    
    <circle cx="140" cy="258" r="8.6" fill="#c9a22a" className="f"></circle>
    <path d="M133.6 255.4 A7 7 0 0 1 137.6 251.6" stroke="#f3dc94" strokeWidth="1.7" fill="none" strokeLinecap="round"></path>
    <circle cx="140" cy="258" r="4.9" fill="#8a1c24" className="f"></circle>
    <path d="M144.2 259.2 A4.2 4.2 0 0 1 139 262.1 A5.4 5.4 0 0 0 144.2 259.2 Z" fill="#5a1015"></path>
    <circle cx="138.4" cy="256.4" r="1.1" fill="#f6efe2"></circle>

    
    <path d="M104 150 C94 146 86 132 82 112 C94 126 102 132 107 136 Z" fill="#efe4d2" className="m"></path>
    <path d="M176 150 C186 146 194 131 199 109 C186 125 178 132 173 136 Z" fill="#cdbcae" className="m"></path>
    <path d="M101 143 C95 138 91 131 88.5 123" className="f" fill="none"></path>
    <path d="M179 143 C185 138 190 130 193 121" className="f" fill="none"></path>

    
    <path d="M140 90 C112 90 100 114 102 144 C104 176 120 208 140 220 C160 208 176 176 178 144 C180 114 168 90 140 90 Z" fill="#efe4d2" filter={`${tex}`}></path>
    <path d="M140 220 C120 208 104 176 102 144 C101 128 104 116 110 106 C108 124 110 142 114 160 C118 182 127 204 140 220 Z" fill="#cdbcae"></path>
    <path d="M108 164 Q115 184 130 195 Q120 182 115 166 Z" fill="#cdbcae"></path>
    <path d="M139.4 151 C138.4 160 137 168 135.4 175.6 L138.6 176.4 C139.6 168 140 160 139.4 151 Z" fill="#cdbcae"></path>
    <path d="M140 220 C124 209 111 188 106 164 C113 184 124 203 140 220 Z" className="cv-fine" fill={`url(#cvHatch-${u})`} opacity=".4"></path>
    <path d="M172 166 Q166 182 154 193" className="cv-fine" stroke="#1a0e0a" strokeOpacity=".5" strokeWidth=".9" fill="none" strokeLinecap="round"></path>
    <path d="M140 90 C112 90 100 114 102 144 C104 176 120 208 140 220 C160 208 176 176 178 144 C180 114 168 90 140 90 Z" className="m" fill="none"></path>
    <path d="M128 216.6 Q140 224.4 152 216.6 Q140 221.6 128 216.6 Z" fill="#1a0e0a"></path>

    
    <path d="M98 150 C92 108 112 74 140 72 C168 74 188 108 182 150 C178 128 172 112 162 104 C154 108 146 112 140 118 C134 112 126 108 118 104 C108 112 102 128 98 150 Z" fill="#1a0e0a" className="m"></path>
    <path d="M150 80.5 Q170 90 177 116" className="cv-fine" stroke="#8a7466" strokeOpacity=".6" strokeWidth="1" fill="none" strokeLinecap="round"></path>
    <path d="M158 79.5 Q176 92 180 124" className="cv-fine" stroke="#8a7466" strokeOpacity=".4" strokeWidth=".8" fill="none" strokeLinecap="round"></path>
    <path d="M146.4 113.4 C152.6 116.4 156.6 121.6 154.2 129.4 C153.2 124.2 150.4 119.8 143.6 116.6 Z" fill="#1a0e0a" className="bw"></path>

    
    <g style={{ animation: "corvBrow 7s ease-in-out infinite" }}>
      <path d="M108.6 133.4 Q121 122 135.4 136.4 Q121 126.6 108.6 133.4 Z" fill="#1a0e0a" className="bw"></path>
      <path d="M171.4 135.6 Q159 125 144.6 137.8 Q159 129.6 171.4 135.6 Z" fill="#1a0e0a" className="bw"></path>
    </g>

    
    <path d="M115.6 148.6 Q123 152.6 130.4 148.6 M149.6 148.6 Q157 152.4 164.4 148.6" className="cv-fine" stroke="#1a0e0a" strokeOpacity=".55" strokeWidth=".8" fill="none" strokeLinecap="round"></path>
    <path d="M114 146 Q123 139.5 132 146 Q123 151 114 146 Z" fill="#f6efe2"></path>
    <path d="M148 146 Q157 140 166 146 Q157 150.6 148 146 Z" fill="#f6efe2"></path>
    <circle cx="124" cy="146" r="4.6" fill="#e0303a" fillOpacity=".6" style={{ filter: "blur(1.6px)", animation: "corvGlow 3s ease-in-out infinite" }}></circle>
    <circle cx="156" cy="146" r="4.6" fill="#e0303a" fillOpacity=".6" style={{ filter: "blur(1.6px)", animation: "corvGlow 3s ease-in-out infinite" }}></circle>
    <circle cx="124" cy="146" r="3.3" fill="#c8242c"></circle>
    <circle cx="156" cy="146" r="3.3" fill="#c8242c"></circle>
    <ellipse cx="124" cy="146" rx=".8" ry="2.4" fill="#1a0e0a"></ellipse>
    <ellipse cx="156" cy="146" rx=".8" ry="2.4" fill="#1a0e0a"></ellipse>
    <circle cx="125.3" cy="144.6" r=".85" fill="#f6efe2"></circle>
    <circle cx="157.3" cy="144.6" r=".85" fill="#f6efe2"></circle>
    <path d="M112.6 146.4 Q123 137.6 133.4 145.6 Q123 140.8 112.6 146.4 Z" fill="#1a0e0a" className="bw"></path>
    <path d="M146.6 145.8 Q157 138.2 167.4 146.2 Q157 141.2 146.6 145.8 Z" fill="#1a0e0a" className="bw"></path>
    <path d="M112.5 146.2 Q123 136.6 133.5 146 Q123 152.2 112.5 146.2 Z" fill="#efe4d2" stroke="#1a0e0a" strokeWidth=".9" style={{ transformBox: "fill-box", transformOrigin: "center top", animation: "corvBlink 5s ease-in-out infinite" }}></path>
    <path d="M146.5 146 Q157 136.8 167.5 146.2 Q157 152 146.5 146 Z" fill="#efe4d2" stroke="#1a0e0a" strokeWidth=".9" style={{ transformBox: "fill-box", transformOrigin: "center top", animation: "corvBlink 5s ease-in-out infinite" }}></path>

    
    <path d="M140.8 148.6 C139.6 159 138 168 135.4 176.4 Q140 182.4 144.8 176.8 Q140 180.2 137 176.2 C139.2 168 140.6 159 140.8 148.6 Z" fill="#1a0e0a" className="bw"></path>

    
    <path d="M135 202.6 Q140 204.4 145 202.6" className="cv-fine" stroke="#1a0e0a" strokeOpacity=".6" strokeWidth=".9" fill="none" strokeLinecap="round"></path>
    <g style={{ transformBox: "fill-box", transformOrigin: "center top", transform: `scaleY(${mouthOpen})`, animation: `${mouthAnim}` }}><path d="M129 193 Q140 206 151 193 Q140 197 129 193 Z" fill="#4a0e14"></path></g>
    <path d="M125.4 191.8 Q140 200.6 154.8 190.8 Q140 197.4 125.4 191.8 Z" fill="#1a0e0a" className="bw"></path>
    <path d="M131.5 193.6 L133.6 202 L136 194.8 Z" fill="#f6efe2" stroke="#1a0e0a" strokeWidth=".7" strokeLinejoin="round"></path>
    <path d="M148.5 193.4 L146.4 201.8 L144 194.6 Z" fill="#f6efe2" stroke="#1a0e0a" strokeWidth=".7" strokeLinejoin="round"></path>
  </g>
  </g></g>

  <g className="cv-medal">
    <circle cx="140" cy="136" r="57.4" fill="none" stroke="#c9a22a" strokeWidth="2.2"></circle>
    <circle cx="140" cy="136" r="53.8" fill="none" stroke="#c9a22a" strokeWidth=".75"></circle>
  </g>

  <g className="cv-raven" transform="translate(198 232)">
    <g style={{ animation: "corvBreath 5s ease-in-out infinite" }}>
      <path d="M0 30 C0 12 14 2 28 6 C40 10 46 24 40 38 L56 60 L34 46 C22 52 4 46 0 30 Z" fill="#1a0e0a" stroke="#1a0e0a" strokeWidth="1.6" strokeLinejoin="round"></path>
      <path d="M12 5 C24 1 37 6 43 20" stroke="#efe4d2" strokeOpacity=".34" strokeWidth="1.1" fill="none" strokeLinecap="round"></path>
      <g style={{ transformBox: "fill-box", transformOrigin: "20% 15%", animation: "corvWing 7s ease-in-out infinite" }}>
        <path d="M7 26 C13 16 27 13 36 21 C42 27 45 38 55 57 L36 44 C26 46 13 40 7 26 Z" fill="#2e2420" stroke="#1a0e0a" strokeWidth="1" strokeLinejoin="round"></path>
        <path d="M13 27 C19 21 27 20 33 25 M15 33 C21 29 29 29 35 34 M28 40 L48 53" stroke="#7a6458" strokeWidth="1" fill="none" strokeLinecap="round"></path>
      </g>
      <path d="M14 46 l-2 9 l-2.6 1.4 M12 55 l2.4 1.2 M22 48 l0 9 l-2.6 1.2 M22 57 l2.6 1" stroke="#c9a22a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
      <g style={{ transformBox: "fill-box", transformOrigin: "30% 85%", animation: "corvRaven 7s ease-in-out infinite" }}>
        <circle cx="24" cy="4" r="11.5" fill="#1a0e0a"></circle>
        <path d="M17.6 -5.6 C16.4 -10.6 18.6 -14.6 22.4 -15.6 C21 -11.6 21 -8.6 22.2 -6.4 Z" fill="#1a0e0a"></path>
        <path d="M17 -4.6 C24 -9 32 -6 35 -.6" stroke="#efe4d2" strokeOpacity=".34" strokeWidth="1" fill="none" strokeLinecap="round"></path>
        <path d="M33 0 L49 5 L33 10 Z" fill="#4a3e38" stroke="#1a0e0a" strokeWidth="1" strokeLinejoin="round"></path>
        <path d="M33 5 L47 5" stroke="#1a0e0a" strokeWidth=".8"></path>
        <circle cx="27" cy="1" r="2.3" fill="#c9a22a"></circle>
        <circle cx="27.2" cy="1.1" r=".9" fill="#1a0e0a"></circle>
        <circle cx="26.3" cy=".2" r=".6" fill="#f3dc94"></circle>
      </g>
    </g>
  </g>
</svg>
  )
}
