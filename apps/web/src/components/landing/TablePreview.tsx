/**
 * Mock visual da mesa virtual — grid com tokens, ordem de iniciativa
 * e chat de dados. Puro visual.
 */
export function TablePreview() {
  const tokens = [
    { x: 20, y: 35, c: '#8b1c1c', l: 'L', hp: 72 },
    { x: 35, y: 50, c: '#1c4a7a', l: 'T', hp: 54 },
    { x: 50, y: 40, c: '#3a6a2e', l: 'K', hp: 88 },
    { x: 70, y: 60, c: '#5a2a6a', l: 'M', hp: 40 },
    { x: 80, y: 30, c: '#7a1c1c', l: 'X', hp: 61 },
  ]
  const initiative = [
    { n: 'Lyra', v: 21, active: true },
    { n: 'Thorgar', v: 18, active: false },
    { n: 'Kael', v: 14, active: false },
    { n: 'Mirella', v: 11, active: false },
    { n: 'Goblin 1', v: 8, active: false },
  ]
  const rolls = [
    { who: 'Lyra', roll: '1d20+5', res: 23, crit: false },
    { who: 'Mestre', roll: '2d6+2', res: 9, crit: false },
    { who: 'Thorgar', roll: '1d20+3', res: 20, crit: true },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      {/* Mapa */}
      <div className="parchment-card relative aspect-[16/10] overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(60,30,10,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(60,30,10,0.18) 1px, transparent 1px)',
            backgroundSize: '8% 12.5%',
          }}
        />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-crypt-deep/80 via-crypt-deep/40 to-transparent" />
        {tokens.map((t) => (
          <div
            key={t.l}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-parchment font-cinzel text-sm font-bold text-parchment shadow-lg"
              style={{ backgroundColor: t.c }}
            >
              {t.l}
            </div>
            <div className="mx-auto mt-1 h-1 w-10 overflow-hidden rounded-full bg-ink/30">
              <div className="h-full bg-ember" style={{ width: `${t.hp}%` }} />
            </div>
          </div>
        ))}
        <div
          className="animate-flicker absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold"
          style={{ left: '50%', top: '40%' }}
        />
        <div className="absolute bottom-3 left-3 rounded-md border border-ink/20 bg-parchment/80 px-3 py-1 font-cinzel text-[10px] tracking-[0.3em] text-ink-soft backdrop-blur-sm">
          MAPA · CRIPTA · DO · CORVO
        </div>
      </div>

      {/* Painel lateral */}
      <div className="flex flex-col gap-4">
        <div className="parchment-card rounded-xl p-5">
          <p className="font-cinzel text-[10px] tracking-[0.3em] text-wax">⚔ INICIATIVA</p>
          <ul className="mt-3 space-y-2">
            {initiative.map((c) => (
              <li
                key={c.n}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 font-cormorant text-sm transition ${
                  c.active ? 'bg-wax/15 ring-1 ring-wax/40' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  {c.active && <span className="text-wax">▶</span>}
                  <span className={c.active ? 'font-semibold text-ink' : 'text-ink-soft'}>{c.n}</span>
                </span>
                <span className="font-cinzel text-ink">{c.v}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="parchment-card rounded-xl p-5">
          <p className="font-cinzel text-[10px] tracking-[0.3em] text-wax">🎲 ROLAGENS</p>
          <ul className="mt-3 space-y-2 font-cormorant text-sm">
            {rolls.map((r, i) => (
              <li key={i} className="border-b border-ink/10 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="italic text-ink-soft">{r.who}</span>
                  <span
                    className={`font-cinzel text-lg font-bold ${
                      r.crit ? 'animate-flicker text-ember' : 'text-ink'
                    }`}
                  >
                    {r.res}
                  </span>
                </div>
                <span className="font-cinzel text-[10px] tracking-wider text-ink-soft">
                  {r.roll} {r.crit && '· CRÍTICO!'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
