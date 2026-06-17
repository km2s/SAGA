import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { LocaleProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/translations'

export const metadata: Metadata = {
  title: 'SAGA — RPG Campaign Manager',
  description: 'Gerencie suas campanhas de RPG de mesa com SAGA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const locale = (cookieStore.get('saga-locale')?.value ?? 'pt') as Locale
  const htmlLang = locale === 'en' ? 'en' : 'pt-BR'

  return (
    <html lang={htmlLang}>
      <body className="bg-bg text-saga-text antialiased">
        <SessionProvider>
          <LocaleProvider initialLocale={locale}>
            {children}
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
