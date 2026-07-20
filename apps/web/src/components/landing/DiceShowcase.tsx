import { Eyebrow } from './Ornament'

/**
 * Vitrine visual de dados (d4 a d20) em SVG: silhueta real de cada poliedro,
 * linhas de faceta e sombreamento de ouro forjado (funciona em ambos os temas —
 * os tons de ouro são fixos, não flipam com .dark).
 */
interface DieDef {
  n: string
  /** Silhueta do poliedro (pontos do polígono, viewBox 0 0 100 100) */
  outline: string
  /** Arestas internas (facetas): [x1, y1, x2, y2] */
  edges: [number, number, number, number][]
  /** Facetas sombreadas/iluminadas por cima do gradiente base */
  faces: { points: string; fill: string }[]
  /** Posição do numeral na face central */
  label: [number, number]
}

const LIGHT = 'rgba(255, 238, 190, 0.16)'
const SHADE = 'rgba(20, 12, 2, 0.16)'
const SHADE_DEEP = 'rgba(20, 12, 2, 0.26)'

const dice: DieDef[] = [
  {
    n: 'd4', // tetraedro de frente: triângulo com aresta para cada vértice
    outline: '50,6 94,90 6,90',
    edges: [[50, 6, 50, 62], [94, 90, 50, 62], [6, 90, 50, 62]],
    faces: [
      { points: '50,6 50,62 6,90', fill: LIGHT },
      { points: '50,6 94,90 50,62', fill: SHADE },
      { points: '50,62 94,90 6,90', fill: 'rgba(255,238,190,0.06)' },
    ],
    label: [50, 80],
  },
  {
    n: 'd6', // cubo isométrico: hexágono com junção em "Y"
    outline: '50,6 88,28 88,72 50,94 12,72 12,28',
    edges: [[12, 28, 50, 50], [88, 28, 50, 50], [50, 50, 50, 94]],
    faces: [
      { points: '50,6 88,28 50,50 12,28', fill: LIGHT },
      { points: '88,28 88,72 50,94 50,50', fill: SHADE_DEEP },
    ],
    label: [50, 34],
  },
  {
    n: 'd8', // octaedro: hexágono com face triangular central
    outline: '50,5 89,27 89,73 50,95 11,73 11,27',
    edges: [
      [50, 20, 80, 70], [80, 70, 20, 70], [20, 70, 50, 20],
      [50, 20, 50, 5], [80, 70, 89, 73], [20, 70, 11, 73],
    ],
    faces: [
      { points: '50,20 80,70 20,70', fill: LIGHT },
      { points: '80,70 89,73 50,95 11,73 20,70', fill: SHADE_DEEP },
      { points: '50,5 89,27 89,73 80,70 50,20', fill: SHADE },
    ],
    label: [50, 58],
  },
  {
    n: 'd10', // trapezoedro pentagonal: "pião" com face central em pipa
    outline: '50,3 90,50 50,97 10,50',
    edges: [
      [50, 3, 72, 40], [72, 40, 50, 72], [50, 72, 28, 40], [28, 40, 50, 3],
      [72, 40, 90, 50], [28, 40, 10, 50], [50, 72, 50, 97],
    ],
    faces: [
      { points: '50,3 72,40 50,72 28,40', fill: LIGHT },
      { points: '72,40 90,50 50,97 50,72', fill: SHADE_DEEP },
      { points: '28,40 10,50 50,97 50,72', fill: SHADE },
    ],
    label: [50, 45],
  },
  {
    n: 'd12', // dodecaedro: decágono com face pentagonal central
    outline: '50,6 77,14.8 93.7,37.8 93.7,66.2 77,89.2 50,98 23,89.2 6.3,66.2 6.3,37.8 23,14.8',
    edges: [
      [50, 28, 72.8, 44.6], [72.8, 44.6, 64.1, 71.4], [64.1, 71.4, 35.9, 71.4],
      [35.9, 71.4, 27.2, 44.6], [27.2, 44.6, 50, 28],
      [50, 28, 50, 6], [72.8, 44.6, 93.7, 37.8], [64.1, 71.4, 77, 89.2],
      [35.9, 71.4, 23, 89.2], [27.2, 44.6, 6.3, 37.8],
    ],
    faces: [
      { points: '50,28 72.8,44.6 64.1,71.4 35.9,71.4 27.2,44.6', fill: LIGHT },
      { points: '64.1,71.4 77,89.2 50,98 23,89.2 35.9,71.4', fill: SHADE_DEEP },
      { points: '72.8,44.6 93.7,37.8 93.7,66.2 77,89.2 64.1,71.4', fill: SHADE },
    ],
    label: [50, 58],
  },
  {
    n: 'd20', // icosaedro: hexágono com face triangular central e facetas radiais
    outline: '50,4 90,27 90,73 50,96 10,73 10,27',
    edges: [
      [50, 22, 76, 66], [76, 66, 24, 66], [24, 66, 50, 22],
      [50, 22, 50, 4], [50, 22, 10, 27], [50, 22, 90, 27],
      [76, 66, 90, 27], [76, 66, 90, 73], [76, 66, 50, 96],
      [24, 66, 10, 27], [24, 66, 10, 73], [24, 66, 50, 96],
    ],
    faces: [
      { points: '50,22 76,66 24,66', fill: LIGHT },
      { points: '24,66 76,66 50,96', fill: SHADE },
      { points: '76,66 90,27 90,73', fill: SHADE_DEEP },
      { points: '24,66 10,27 10,73', fill: 'rgba(255,238,190,0.05)' },
    ],
    label: [50, 55],
  },
]

function Die({ die }: { die: DieDef }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`die-grad-${die.n}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f2d76f" />
          <stop offset="48%" stopColor="#c9a22a" />
          <stop offset="100%" stopColor="#8a6a1e" />
        </linearGradient>
        <radialGradient id={`die-depth-${die.n}`} cx="0.5" cy="0.42" r="0.72">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(24,15,3,0.32)" />
        </radialGradient>
      </defs>
      <polygon points={die.outline} fill={`url(#die-grad-${die.n})`} />
      {die.faces.map((f, i) => (
        <polygon key={i} points={f.points} fill={f.fill} />
      ))}
      <polygon points={die.outline} fill={`url(#die-depth-${die.n})`} />
      {die.edges.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(58,42,12,0.5)" strokeWidth="1.3" strokeLinecap="round" />
      ))}
      <polygon points={die.outline} fill="none"
        stroke="#6d5416" strokeWidth="2" strokeLinejoin="round" />
      <text x={die.label[0]} y={die.label[1]} textAnchor="middle" dominantBaseline="middle"
        className="font-cinzel" fontSize="14" fontWeight="700" fill="#33250a">
        {die.n}
      </text>
    </svg>
  )
}

export function DiceShowcase() {
  return (
    <section className="relative py-24 text-ink">
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center">
          <Eyebrow className="font-cinzel text-xs tracking-[0.45em] text-wax">FORJA · DE · DADOS</Eyebrow>
          <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
            Cada rolagem,
            <br />
            <span className="gold-text italic">um instante decisivo.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-cormorant text-lg italic text-ink-soft">
            Do humilde d4 ao temido d20. Críticos brilham, falhas estremecem a mesa.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 md:grid-cols-6">
          {dice.map((d, i) => (
            <div key={d.n} className="group flex flex-col items-center gap-3">
              <div
                className="animate-float-slow relative h-24 w-24 drop-shadow-[0_10px_18px_rgba(51,41,29,0.35)] transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_18px_rgba(201,162,42,0.4)]"
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                <Die die={d} />
              </div>
              <span className="font-cinzel text-[10px] tracking-[0.3em] text-ink-soft">
                {d.n.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
