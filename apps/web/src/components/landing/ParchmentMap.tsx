/**
 * Mapa de batalha em pergaminho — ilustração pura em SVG/CSS.
 * Substitui a cena 3D (three.js) do template, com o mesmo clima:
 * rio, floresta, montanhas, grade, peças e um d20 dourado flutuante.
 */
export function ParchmentMap() {
  const tokens = [
    { x: 22, y: 62, c: '#8b1c1c', l: 'L' },
    { x: 40, y: 48, c: '#1c4a7a', l: 'T' },
    { x: 55, y: 66, c: '#3a6a2e', l: 'K' },
    { x: 68, y: 40, c: '#5a2a6a', l: 'M' },
  ]

  return (
    <div className="absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
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

        {/* borda vinheta */}
        <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="#32190550" strokeWidth="1.4" />
      </svg>

      {/* peças no mapa */}
      {tokens.map((t) => (
        <div
          key={t.l}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-parchment font-cinzel text-xs font-bold text-parchment shadow-lg md:h-9 md:w-9"
            style={{ backgroundColor: t.c }}
          >
            {t.l}
          </div>
        </div>
      ))}

      {/* d20 dourado flutuante */}
      <div className="animate-float-slow absolute right-[10%] top-[14%]">
        <svg width="72" height="72" viewBox="0 0 100 100" className="drop-shadow-[0_0_18px_rgba(212,168,75,0.5)]">
          <polygon
            points="50,4 92,28 92,72 50,96 8,72 8,28"
            fill="url(#d20g)"
            stroke="#5a3a10"
            strokeWidth="2"
          />
          <polygon points="50,4 92,28 50,50 8,28" fill="#ffffff" fillOpacity="0.18" />
          <text
            x="50"
            y="60"
            textAnchor="middle"
            className="font-cinzel"
            fontSize="26"
            fontWeight="700"
            fill="#3a2408"
          >
            20
          </text>
        </svg>
      </div>
    </div>
  )
}
