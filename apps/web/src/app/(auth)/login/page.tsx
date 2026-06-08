import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'
import { Dice6, Map, ScrollText, Swords, Music } from 'lucide-react'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-bg bg-gradient-login flex flex-col items-center justify-center gap-0 pt-8">
      {/* Logo */}
      <h1 className="font-cinzel text-7xl font-bold tracking-[20px] text-gold-gradient mb-1">
        SAGA
      </h1>
      <p className="text-[11px] text-saga-muted tracking-[5px] uppercase mb-12">
        Gerencie suas aventuras
      </p>

      {/* Card */}
      <div className="bg-surface border border-border rounded-lg p-8 sm:p-10 w-[calc(100%-2rem)] sm:w-[380px] flex flex-col items-center gap-4">
        <h2 className="font-cinzel text-lg font-semibold text-saga-text">Entrar no SAGA</h2>
        <p className="text-[13px] text-saga-muted text-center leading-relaxed">
          Conecte sua conta do Discord para acessar suas campanhas, fichas e mesas virtuais.
        </p>
        <LoginButton />
      </div>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-10 px-4">
        {[
          { Icon: Dice6,     label: 'Rolagem inteligente' },
          { Icon: Map,       label: 'Mesa virtual' },
          { Icon: ScrollText,label: 'Fichas completas' },
          { Icon: Swords,    label: 'Gestão de NPCs' },
          { Icon: Music,     label: 'Trilha sonora' },
        ].map(f => (
          <div key={f.label} className="flex flex-col items-center gap-2 text-saga-muted text-[11px]">
            <div className="w-10 h-10 rounded bg-surface-2 border border-border flex items-center justify-center">
              <f.Icon size={18} />
            </div>
            {f.label}
          </div>
        ))}
      </div>
    </main>
  )
}
