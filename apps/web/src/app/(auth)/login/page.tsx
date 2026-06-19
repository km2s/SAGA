import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'
import { Dice6, Map, ScrollText, Swords, Music } from 'lucide-react'
import { getServerT } from '@/lib/i18n/getServerT'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')
  const t = getServerT()

  const features = [
    { Icon: Dice6,      label: t.login.featureDice },
    { Icon: Map,        label: t.login.featureTable },
    { Icon: ScrollText, label: t.login.featureSheets },
    { Icon: Swords,     label: t.login.featureNpcs },
    { Icon: Music,      label: t.login.featureMusic },
  ]

  return (
    <main className="min-h-screen bg-bg bg-gradient-login flex flex-col items-center justify-center pt-8">
      {/* Logo */}
      <h1 className="font-cinzel text-7xl font-bold tracking-[20px] text-gold-gradient mb-1">
        SAGA
      </h1>
      <p className="text-[11px] text-saga-muted tracking-[5px] uppercase mb-12">
        {t.login.tagline}
      </p>

      {/* Card */}
      <div className="bg-surface border border-border rounded-lg p-8 sm:p-10 w-[calc(100%-2rem)] sm:w-[380px] flex flex-col items-center gap-4">
        <h2 className="font-cinzel text-lg font-semibold text-saga-text">{t.login.heading}</h2>
        <p className="text-[13px] text-saga-muted text-center leading-relaxed">
          {t.login.description}
        </p>
        <LoginButton />
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 sm:gap-6 mt-10 px-4">
        {features.map(f => (
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
