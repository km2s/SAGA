import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'

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
      <div className="bg-surface border border-border rounded-lg p-10 w-[380px] flex flex-col items-center gap-4">
        <h2 className="font-cinzel text-lg font-semibold text-saga-text">Entrar no SAGA</h2>
        <p className="text-[13px] text-saga-muted text-center leading-relaxed">
          Conecte sua conta do Discord para acessar suas campanhas, fichas e mesas virtuais.
        </p>
        <LoginButton />
      </div>

      {/* Features */}
      <div className="flex gap-6 mt-10">
        {[
          { icon: '🎲', label: 'Rolagem inteligente' },
          { icon: '🗺️', label: 'Mesa virtual' },
          { icon: '📜', label: 'Fichas completas' },
          { icon: '⚔️', label: 'Gestão de NPCs' },
          { icon: '🎵', label: 'Trilha sonora' },
        ].map(f => (
          <div key={f.label} className="flex flex-col items-center gap-2 text-saga-muted text-[11px]">
            <div className="w-10 h-10 rounded bg-surface-2 border border-border flex items-center justify-center text-lg">
              {f.icon}
            </div>
            {f.label}
          </div>
        ))}
      </div>
    </main>
  )
}
