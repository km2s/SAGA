/**
 * Depoimentos em estilo "carta lacrada" — mockados.
 */
export function Testimonials() {
  const quotes = [
    {
      q: 'Minha mesa de vampiro virou uma crônica de verdade. Os jogadores releem as sessões antigas.',
      a: 'Helena, Mestra · 4 anos de mesa',
    },
    {
      q: 'O bot do Discord salvou nossas sessões à distância. Rolar dados nunca foi tão dramático.',
      a: 'Rafael, Jogador · D&D 5e',
    },
    {
      q: 'Finalmente uma ferramenta que entende fichas além de Fantasia. Cyberpunk fluindo sem hack.',
      a: 'Marina, Mestra · Cyberpunk',
    },
  ]

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <p className="font-cinzel text-xs tracking-[0.45em] text-wax">✒ VOZES · DA · TAVERNA ✒</p>
        <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
          O que dizem os
          <br />
          <span className="italic text-ink-soft">mestres e bravos.</span>
        </h2>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {quotes.map((q, i) => (
          <figure
            key={i}
            className="parchment-card relative rounded-xl p-7"
            style={{ transform: `rotate(${i % 2 === 0 ? '-0.6deg' : '0.6deg'})` }}
          >
            <span className="absolute -top-3 left-6 bg-parchment px-2 font-cinzel text-3xl text-wax">"</span>
            <blockquote className="font-cormorant text-lg italic leading-relaxed text-ink">{q.q}</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="wax-seal flex h-9 w-9 items-center justify-center rounded-full font-cinzel text-xs">
                ⚜
              </span>
              <span className="font-cinzel text-xs tracking-wider text-ink-soft">{q.a}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
