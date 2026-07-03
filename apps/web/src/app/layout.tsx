import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'SAGA — RPG Campaign Manager',
  description: 'Gerencie suas campanhas de RPG de mesa com SAGA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce gerado pelo middleware por request — Next.js 14 lê x-nonce e aplica nos seus scripts internos
  const nonce = headers().get('x-nonce') ?? undefined

  return (
    <html lang="pt-BR">
      <body className="bg-parchment text-ink antialiased" nonce={nonce}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
