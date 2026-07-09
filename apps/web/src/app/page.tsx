import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Crest, Divider, Eyebrow, Fleuron } from '@/components/landing/Ornament'
import { ScrollText, Map, Dice6, Feather, Bot, DoorOpen, ArrowRight } from 'lucide-react'
import { ParchmentMap } from '@/components/landing/ParchmentMap'
import { SheetPreview } from '@/components/landing/SheetPreview'
import { TablePreview } from '@/components/landing/TablePreview'
import { DiceShowcase } from '@/components/landing/DiceShowcase'
import { Testimonials } from '@/components/landing/Testimonials'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <main className="parchment-bg relative min-h-screen overflow-x-hidden text-ink">
      <Nav />
      <Hero />
      <Features />
      <SheetSection />
      <Systems />
      <TableSection />
      <DiceShowcase />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  )
}

function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3">
        <Crest className="h-9 w-9 drop-shadow-sm" />
        <div className="flex flex-col leading-none">
          <span className="font-cinzel text-2xl font-bold tracking-widest text-ink">SAGA</span>
          <span className="font-cormorant text-[11px] italic tracking-[0.3em] text-ink-soft">
            RPG · DE · MESA
          </span>
        </div>
      </div>
      <nav className="hidden items-center gap-8 font-cinzel text-sm tracking-widest text-ink-soft md:flex">
        <a href="#features" className="transition hover:text-wax">Recursos</a>
        <a href="#sistemas" className="transition hover:text-wax">Sistemas</a>
        <a href="#como-funciona" className="transition hover:text-wax">Como Funciona</a>
      </nav>
      <Link
        href="/login"
        className="rounded-md border border-ink/30 bg-parchment px-4 py-2 font-cinzel text-sm font-semibold tracking-wider text-ink shadow-sm transition hover:border-wax hover:text-wax"
      >
        Entrar
      </Link>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-14">
      <div className="relative z-10 flex flex-col justify-center">
        <Eyebrow className="animate-ink-in font-cinzel text-sm tracking-[0.45em] text-wax">
          CRÔNICAS · DOS · BRAVOS
        </Eyebrow>
        <h1 className="animate-ink-in mt-6 text-balance font-cinzel text-5xl font-bold leading-[1.05] text-ink md:text-6xl lg:text-7xl">
          Reúna sua mesa.
          <br />
          <span className="gold-text italic">Conte sua saga.</span>
        </h1>
        <p
          className="animate-ink-in mt-6 max-w-xl font-cormorant text-lg leading-relaxed text-ink-soft md:text-xl"
          style={{ animationDelay: '0.2s' }}
        >
          Uma plataforma forjada para mestres e jogadores. Campanhas, fichas de personagem,
          mesa virtual com tokens e iniciativa, rolagem de dados em tempo real e um bot do
          Discord que se senta à mesa com vocês.
        </p>

        <div className="animate-ink-in mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: '0.4s' }}>
          <Link
            href="/login"
            className="wax-seal group relative inline-flex items-center gap-3 rounded-md px-7 py-3.5 font-cinzel text-sm font-semibold tracking-[0.2em] transition hover:scale-[1.02]"
          >
            ABRIR O GRIMÓRIO
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-md border border-ink/30 bg-parchment/60 px-6 py-3.5 font-cinzel text-sm font-semibold tracking-[0.2em] text-ink backdrop-blur-sm transition hover:border-wax hover:text-wax"
          >
            CONHECER A MESA
          </a>
        </div>

        <div
          className="animate-ink-in mt-12 flex items-center gap-6 font-cormorant text-sm italic text-ink-soft"
          style={{ animationDelay: '0.6s' }}
        >
          <Stat n="12+" label="Sistemas suportados" />
          <span className="h-8 w-px bg-ink/20" />
          <Stat n="∞" label="Campanhas possíveis" />
          <span className="h-8 w-px bg-ink/20" />
          <Stat n="1d20" label="Rola na mesa" />
        </div>
      </div>

      {/* Mapa em pergaminho */}
      <div className="relative h-[460px] w-full md:h-[560px] lg:h-[620px]">
        <div className="parchment-card animate-float-slow relative h-full w-full overflow-hidden rounded-2xl">
          <ParchmentMap />
          <CornerOrnament className="left-3 top-3" />
          <CornerOrnament className="right-3 top-3 rotate-90" />
          <CornerOrnament className="bottom-3 left-3 -rotate-90" />
          <CornerOrnament className="bottom-3 right-3 rotate-180" />
          <div className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-md border border-ink/20 bg-parchment/80 px-4 py-1.5 font-cinzel text-[10px] tracking-[0.3em] text-ink-soft backdrop-blur-sm">
            <Fleuron className="h-2 w-auto opacity-80" />
            MAPA · DAS · CAMPANHAS
            <Fleuron className="h-2 w-auto opacity-80" />
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ember/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-wax/20 blur-3xl" />
      </div>
    </section>
  )
}

function CornerOrnament({ className = '' }: { className?: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className={`absolute z-10 text-wax ${className}`}>
      <path
        d="M2 2h14M2 2v14M2 2l8 8M16 4c-4 0-6 2-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-cinzel text-2xl font-bold text-wax">{n}</span>
      <span className="text-xs not-italic tracking-wider text-ink-soft">{label}</span>
    </div>
  )
}

function Features() {
  const items = [
    {
      title: 'Fichas Vivas',
      Icon: ScrollText,
      desc: 'Atributos, perícias, magias, disciplinas. Editáveis em tempo real durante a sessão, com habilidades criáveis para qualquer ideia.',
    },
    {
      title: 'Mesa Virtual',
      Icon: Map,
      desc: 'Mapas com tokens arrastáveis, barras de HP, névoa de guerra, pings, iniciativa e música ambiente — tudo sincronizado.',
    },
    {
      title: 'Dados Forjados',
      Icon: Dice6,
      desc: 'Role 1d20, 2d6+3, ou direto de um atributo da ficha. Críticos e falhas com destaque dramático no chat da mesa.',
    },
    {
      title: 'Crônicas Compartilhadas',
      Icon: Feather,
      desc: 'Notas privadas, handouts, resumos de sessão e histórico. Sua campanha vira um livro que vocês escrevem juntos.',
    },
    {
      title: 'Companhia do Bot',
      Icon: Bot,
      desc: 'Bot do Discord integrado: role dados, consulte fichas e veja sua campanha sem sair do servidor da mesa.',
    },
    {
      title: 'Salão Aberto',
      Icon: DoorOpen,
      desc: 'Torne sua campanha pública na taverna do /explorar — jogadores encontram mesas e se inscrevem por código de convite.',
    },
  ]

  return (
    <section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <Eyebrow className="font-cinzel text-xs tracking-[0.45em] text-wax">ARSENAL DO MESTRE</Eyebrow>
        <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
          Tudo que sua mesa precisa,
          <br />
          <span className="italic text-ink-soft">em um único pergaminho.</span>
        </h2>
        <Divider className="mt-8" />
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.title}
            className="parchment-card group relative rounded-xl p-7 transition hover:-translate-y-1 hover:shadow-[0_40px_60px_-30px_rgba(60,30,10,0.45)]"
          >
            <div className="flex items-start gap-4">
              <div className="wax-seal flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                <it.Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-cinzel text-xl font-bold text-ink">{it.title}</h3>
                <p className="mt-2 font-cormorant leading-relaxed text-ink-soft">{it.desc}</p>
              </div>
            </div>
            <div className="hairline mt-6 h-px" />
          </article>
        ))}
      </div>
    </section>
  )
}

function Systems() {
  const systems = [
    { cat: 'Fantasia', name: 'D&D 5e', desc: 'Atributos, combate, magias e habilidades.' },
    { cat: 'World of Darkness', name: 'Vampiro V20', desc: 'Disciplinas, antecedentes, humanidade.' },
    { cat: 'Horror', name: 'Call of Cthulhu', desc: 'Sanidade, perícias, investigação.' },
    { cat: 'Sci-Fi', name: 'Cyberpunk', desc: 'Atributos, implantes, netrunning.' },
    { cat: 'Genérico', name: 'Sua Criação', desc: 'Atributos livres, campos personalizados.' },
  ]

  return (
    <section id="sistemas" className="relative py-24 text-ink">
      <div className="animate-flicker pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center">
          <Eyebrow className="font-cinzel text-xs tracking-[0.45em] text-wax">CINCO REINOS</Eyebrow>
          <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
            Um sistema para
            <br />
            <span className="gold-text italic">cada lenda.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-cormorant text-lg italic text-ink-soft">
            Da masmorra à cidade neon, da casa assombrada ao covil do vampiro — o Saga adapta
            a ficha ao que sua mesa quer contar.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {systems.map((s) => (
            <div
              key={s.name}
              className="parchment-card group relative rounded-xl border border-ink/15 p-6 transition hover:-translate-y-1 hover:border-wax/40"
            >
              <p className="font-cinzel text-[10px] tracking-[0.3em] text-wax">{s.cat}</p>
              <h3 className="mt-3 font-cinzel text-xl font-bold text-ink">{s.name}</h3>
              <p className="mt-2 font-cormorant text-sm leading-relaxed text-ink-soft">{s.desc}</p>
              <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SheetSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow className="justify-start font-cinzel text-xs tracking-[0.45em] text-wax">FICHA · VIVA</Eyebrow>
          <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
            O personagem que
            <br />
            <span className="gold-text italic">respira com a mesa.</span>
          </h2>
          <p className="mt-6 font-cormorant text-lg leading-relaxed text-ink-soft">
            Atributos, perícias, recursos e vitalidade — editáveis em tempo real durante a
            sessão. Cada mudança ecoa para todos os jogadores e para o mestre, sem precisar
            recarregar a página ou trocar de aba.
          </p>
          <ul className="mt-8 space-y-3 font-cormorant text-ink">
            {[
              'Modificadores calculados automaticamente',
              'Habilidades criáveis para qualquer ideia',
              'Histórico de mudanças no log da campanha',
              'Mais de 25 sistemas com fichas dedicadas',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-2 inline-block h-1.5 w-1.5 rotate-45 bg-wax" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <SheetPreview />
      </div>
    </section>
  )
}

function TableSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <Eyebrow className="font-cinzel text-xs tracking-[0.45em] text-wax">MESA · VIRTUAL</Eyebrow>
        <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
          Onde a batalha
          <br />
          <span className="italic text-ink-soft">ganha vida.</span>
        </h2>
        <Divider className="mt-8" />
      </div>
      <div className="mt-16">
        <TablePreview />
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: 'I',
      title: 'Forje a Campanha',
      desc: 'Crie sua mesa em segundos: nome, sistema, tema. One-shot ou crônica longa, sua escolha.',
    },
    {
      n: 'II',
      title: 'Convoque os Bravos',
      desc: 'Envie o código de convite ou abra a campanha na taverna pública. A mesa se monta sozinha.',
    },
    {
      n: 'III',
      title: 'Que a Saga Comece',
      desc: 'Abra a mesa virtual, distribua tokens, role iniciativa. Cada sessão fica registrada como capítulo.',
    },
  ]

  return (
    <section id="como-funciona" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <Eyebrow className="font-cinzel text-xs tracking-[0.45em] text-wax">TRÊS PASSOS</Eyebrow>
        <h2 className="mt-4 font-cinzel text-4xl font-bold text-ink md:text-5xl">
          Do primeiro dado
          <br />
          <span className="italic text-ink-soft">à última sessão.</span>
        </h2>
        <Divider className="mt-8" />
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="parchment-card relative rounded-xl p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center">
              <div className="wax-seal flex h-20 w-20 items-center justify-center rounded-full font-cinzel text-3xl font-bold">
                {s.n}
              </div>
            </div>
            <h3 className="mt-6 font-cinzel text-2xl font-bold text-ink">{s.title}</h3>
            <p className="mt-3 font-cormorant leading-relaxed text-ink-soft">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24">
      <div className="parchment-card relative overflow-hidden rounded-2xl p-12 text-center md:p-16">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-wax/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <Crest className="mx-auto h-14 w-14" />
        <h2 className="mt-6 font-cinzel text-4xl font-bold text-ink md:text-5xl">
          A mesa está pronta.
          <br />
          <span className="gold-text italic">Falta só o mestre.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-cormorant text-lg italic text-ink-soft">
          Crie sua primeira campanha em menos tempo do que leva pra rolar iniciativa.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="wax-seal group inline-flex items-center gap-3 rounded-md px-8 py-4 font-cinzel text-sm font-semibold tracking-[0.25em] transition hover:scale-[1.02]"
          >
            COMEÇAR A SAGA
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink/15 bg-parchment-deep/40 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <Crest className="h-7 w-7" />
          <span className="font-cinzel text-sm tracking-[0.3em] text-ink-soft">SAGA · MMXXVI</span>
        </div>
        <p className="font-cormorant text-sm italic text-ink-soft">
          "Que vossos dados rolem altos, e vossas histórias mais ainda."
        </p>
      </div>
    </footer>
  )
}
