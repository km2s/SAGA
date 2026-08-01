/**
 * Mock visual de ficha de personagem — pergaminho com atributos,
 * perícias e barra de HP. Sem lógica, puro template.
 */
export function SheetPreview() {
  const attrs = [
    { k: 'FOR', v: 14, mod: '+2' },
    { k: 'DES', v: 16, mod: '+3' },
    { k: 'CON', v: 13, mod: '+1' },
    { k: 'INT', v: 12, mod: '+1' },
    { k: 'SAB', v: 15, mod: '+2' },
    { k: 'CAR', v: 10, mod: '+0' },
  ]
  const skills = [
    { n: 'Furtividade', v: '+7', prof: true },
    { n: 'Investigação', v: '+5', prof: true },
    { n: 'Persuasão', v: '+2', prof: false },
    { n: 'Arcanismo', v: '+5', prof: true },
    { n: 'Atletismo', v: '+4', prof: false },
  ]

  return (
    <div className="parchment-card relative mx-auto max-w-2xl overflow-hidden rounded-2xl p-8 md:p-10">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-ink/15" />
      <div className="pointer-events-none absolute inset-x-0 top-[calc(50%-1px)] h-2 bg-gradient-to-b from-ink/10 to-transparent" />

      <header className="flex items-start justify-between gap-6 border-b border-ink/15 pb-5">
        <div>
          <p className="font-cinzel text-[10px] tracking-[0.4em] text-wax">FICHA · DE · PERSONAGEM</p>
          <h3 className="mt-2 font-cinzel text-3xl font-bold text-ink">Lyra Sombravento</h3>
          <p className="font-cormorant text-sm italic text-ink-soft">
            Meio-elfa · Ladina Arcana · Nível 5
          </p>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-wax/60 bg-parchment-deep">
          <span className="font-cinzel text-2xl font-bold text-wax">5</span>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3 md:grid-cols-6">
        {attrs.map((a) => (
          <div key={a.k} className="rounded-lg border border-ink/15 bg-parchment/60 p-3 text-center">
            <p className="font-cinzel text-[10px] tracking-[0.2em] text-ink-soft">{a.k}</p>
            <p className="mt-1 font-cinzel text-2xl font-bold text-ink">{a.v}</p>
            <p className="font-cinzel text-xs text-wax">{a.mod}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="font-cinzel text-[10px] tracking-[0.3em] text-wax">VITALIDADE</p>
          <div className="mt-2 flex items-end justify-between font-cinzel">
            <span className="text-3xl font-bold text-ink">34</span>
            <span className="text-sm text-ink-soft">/ 42 PV</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/15">
            <div className="h-full rounded-full bg-gradient-to-r from-wax to-ember" style={{ width: '81%' }} />
          </div>

          <p className="mt-5 font-cinzel text-[10px] tracking-[0.3em] text-wax">RECURSOS</p>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-6 w-6 rotate-45 border-2 border-wax ${i <= 3 ? 'bg-wax' : 'bg-transparent'}`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="font-cinzel text-[10px] tracking-[0.3em] text-wax">PERÍCIAS</p>
          <ul className="mt-2 space-y-1.5">
            {skills.map((s) => (
              <li key={s.n} className="flex items-center justify-between font-cormorant text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.prof ? 'bg-wax' : 'bg-ink/25'}`} />
                  {s.n}
                </span>
                <span className="font-cinzel text-ink">{s.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
