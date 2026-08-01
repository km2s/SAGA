import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LoginButton from './LoginButton'
import { Dice6, Map, ScrollText, Swords, Music } from 'lucide-react'
import { Crest, Divider } from '@/components/landing/Ornament'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <main className="parchment-bg flex min-h-screen flex-col items-center justify-center px-4 py-16 text-ink">
      <Link href="/" className="mb-10 flex flex-col items-center gap-3">
        <Crest className="h-14 w-14" />
        <h1 className="gold-text font-cinzel text-6xl font-bold tracking-[16px]">SAGA</h1>
        <p className="text-[11px] uppercase tracking-[5px] text-ink-soft">Gerencie suas aventuras</p>
      </Link>

      <div className="parchment-card flex w-full max-w-md flex-col items-center gap-5 rounded-lg p-10">
        <h2 className="font-cinzel text-xl text-ink">Entrar no Saga</h2>
        <p className="text-center font-cormorant text-base leading-relaxed text-ink-soft">
          Conecte sua conta do Discord para acessar suas campanhas, fichas e mesas virtuais.
        </p>

        <LoginButton />

        <Divider className="w-full" />

        <p className="text-center font-cormorant text-sm italic text-ink-soft">
          "Toda grande saga começa com um simples passo na estrada."
        </p>
      </div>

      <div className="mt-12 grid max-w-3xl grid-cols-3 gap-5 md:grid-cols-5">
        {[
          { i: Dice6, l: 'Dados' },
          { i: Map, l: 'Mesa virtual' },
          { i: ScrollText, l: 'Fichas' },
          { i: Swords, l: 'Combate' },
          { i: Music, l: 'Ambientação' },
        ].map(({ i: Icon, l }) => (
          <div key={l} className="flex flex-col items-center gap-2 text-ink-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-ink/20 bg-parchment/60">
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] uppercase tracking-[2px]">{l}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
