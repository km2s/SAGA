/**
 * Mesa de RPG "viva" — mapa de batalha em pergaminho, animado em SVG puro.
 * Recria o clima da cena 3D do template (three.js) sem o peso: peças que
 * patrulham o mapa (animateMotion), d20 dourado flutuando e girando, tochas
 * tremeluzindo e um ping pulsando. Leve, responsivo e compatível com o CSP.
 */

interface Piece {
  c: string
  l: string
  hp: number
  dur: string
  path: string
}

const PIECES: Piece[] = [
  { c: '#8b1c1c', l: 'L', hp: 0.7, dur: '15s', path: 'M22,64 L32,54 L44,58 L40,70 L26,72 Z' },
  { c: '#1c4a7a', l: 'T', hp: 0.5, dur: '19s', path: 'M56,46 L69,50 L73,63 L60,68 L50,58 Z' },
  { c: '#3a6a2e', l: 'K', hp: 0.85, dur: '17s', path: 'M40,30 L53,34 L61,27 L50,22 L38,26 Z' },
  { c: '#5a2a6a', l: 'M', hp: 0.4, dur: '21s', path: 'M68,40 L78,46 L74,58 L64,52 Z' },
]

export function ParchmentMap() {
  return (
    <div className="absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <radialGradient id="mapBase" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#f0e0bd" />
            <stop offset="60%" stopColor="#dec79a" />
            <stop offset="100%" stopColor="#b89a68" />
          </radialGradient>
          <linearGradient id="d20g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0d060" />
            <stop offset="100%" stopColor="#8f6a1e" />
          </linearGradient>
        </defs>

        {/* base */}
        <rect x="0" y="0" width="100" height="100" fill="url(#mapBase)" />

        {/* grade */}
        <g stroke="#3c1e0a" strokeOpacity="0.18" strokeWidth="0.2">
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={i * (100 / 12)} y1="0" x2={i * (100 / 12)} y2="100" />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * (100 / 12)} x2="100" y2={i * (100 / 12)} />
          ))}
        </g>

        {/* rio */}
        <path
          d="M8 18 C 30 34, 50 20, 68 50 C 80 66, 88 72, 94 90"
          fill="none"
          stroke="#3c5a8c"
          strokeOpacity="0.4"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* floresta */}
        <g fill="#28461e" fillOpacity="0.55">
          {[
            [20, 70], [24, 74], [28, 71], [22, 78], [27, 80], [31, 76], [18, 74], [30, 83],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.6 + (i % 3) * 0.6} />
          ))}
        </g>

        {/* montanhas */}
        <g fill="#463728" fillOpacity="0.7">
          {[60, 66, 72, 78].map((x, i) => (
            <polygon key={i} points={`${x},30 ${x + 4},22 ${x + 8},31`} />
          ))}
        </g>

        {/* rosa dos ventos */}
        <g transform="translate(84,16)" stroke="#6a2817" strokeOpacity="0.6" fill="#6a2817" fillOpacity="0.6">
          <circle r="5" fill="none" strokeWidth="0.4" />
          <polygon points="0,-6 1.1,0 0,6 -1.1,0" />
          <polygon points="-6,0 0,1.1 6,0 0,-1.1" fillOpacity="0.35" />
        </g>

        {/* névoa de guerra (borda direita) */}
        <rect x="70" y="0" width="30" height="100" fill="url(#mapBase)" opacity="0" />
        <rect x="74" y="0" width="26" height="100" fill="#0b0c11" opacity="0.28" />

        {/* ping pulsante */}
        <circle cx="50" cy="42" r="3" fill="none" stroke="#c9a22a" strokeWidth="0.5">
          <animate attributeName="r" values="2;9;2" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.9;0;0.9" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* peças patrulhando o mapa */}
        {PIECES.map((p) => (
          <g key={p.l}>
            {/* corpo */}
            <circle r="3.4" fill={p.c} stroke="#f3e9d2" strokeWidth="0.6" />
            {/* letra */}
            <text
              x="0"
              y="1.3"
              textAnchor="middle"
              fontSize="3.4"
              fontWeight="700"
              fill="#f3e9d2"
              fontFamily="Cinzel, serif"
            >
              {p.l}
            </text>
            {/* barra de vida */}
            <rect x="-3.4" y="4.4" width="6.8" height="1" rx="0.5" fill="#33291d" fillOpacity="0.4" />
            <rect x="-3.4" y="4.4" width={6.8 * p.hp} height="1" rx="0.5" fill="#d9662b" />
            {/* patrulha */}
            <animateMotion dur={p.dur} repeatCount="indefinite" rotate="0" calcMode="linear" path={p.path} />
            {/* leve "bob" ao andar */}
            <animateTransform
              attributeName="transform"
              type="scale"
              additive="sum"
              values="1;1.06;1"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </g>
        ))}
      </svg>

      {/* d20 dourado flutuante */}
      <div className="animate-float-slow absolute right-[9%] top-[12%]">
        <svg
          width="76"
          height="76"
          viewBox="0 0 100 100"
          className="animate-[spin_18s_linear_infinite] drop-shadow-[0_0_18px_rgba(212,168,75,0.55)]"
        >
          <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="url(#d20g)" stroke="#5a3a10" strokeWidth="2" />
          <polygon points="50,4 92,28 50,50 8,28" fill="#ffffff" fillOpacity="0.18" />
          <polygon points="50,50 92,28 92,72" fill="#000000" fillOpacity="0.10" />
          <text
            x="50"
            y="60"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="#3a2408"
            fontFamily="Cinzel, serif"
          >
            20
          </text>
        </svg>
      </div>

      {/* tochas nos cantos (tremeluzindo) */}
      {['left-[6%] top-[8%]', 'right-[6%] top-[8%]', 'left-[6%] bottom-[8%]', 'right-[6%] bottom-[8%]'].map((pos) => (
        <span
          key={pos}
          className={`animate-flicker absolute h-2 w-2 rounded-full bg-ember ${pos}`}
          style={{ boxShadow: '0 0 10px 3px rgba(217,102,43,0.6)' }}
        />
      ))}
    </div>
  )
}
