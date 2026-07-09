import { Eyebrow } from './Ornament'

/**
 * Vitrine visual de dados (d4 a d20) em CSS estilizado, com brilho de ouro.
 */
const dice = [
  { n: 'd4', shape: 'polygon(50% 0%, 100% 100%, 0% 100%)' },
  { n: 'd6', shape: 'inset(0)' },
  { n: 'd8', shape: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { n: 'd10', shape: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' },
  { n: 'd12', shape: 'polygon(50% 0%, 95% 35%, 80% 90%, 20% 90%, 5% 35%)' },
  { n: 'd20', shape: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' },
]

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
            <div key={d.n} className="flex flex-col items-center gap-3">
              <div
                className="animate-float-slow relative h-24 w-24"
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-br from-gold via-gold-deep to-wax-deep shadow-[0_10px_24px_-12px_rgba(51,41,29,0.4)]"
                  style={{ clipPath: d.shape }}
                />
                <div
                  className="absolute inset-[14%] flex items-center justify-center bg-parchment"
                  style={{ clipPath: d.shape }}
                >
                  <span className="font-cinzel text-sm font-bold text-gold-deep">{d.n}</span>
                </div>
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
