import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import '@/styles/saga.css'
import SessionProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'SAGA — RPG Campaign Manager',
  description: 'Gerencie suas campanhas de RPG de mesa com SAGA',
}

// Aplica o tema salvo antes da primeira pintura — evita "flash" de tema
// errado. Durante o rollout em fases, o dark é opt-in pelo toggle (não segue
// a preferência do SO ainda). Roda com o nonce da CSP.
// data-tema alimenta os tokens do redesign (styles/saga.css); .dark segue
// valendo para as telas antigas enquanto a migração não termina.
const themeScript = `(function(){var d=document.documentElement;d.setAttribute('data-tema','claro');try{if(localStorage.getItem('saga-theme')==='dark'){d.classList.add('dark');d.setAttribute('data-tema','escuro')}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce gerado pelo middleware por request — Next.js 14 lê x-nonce e aplica nos seus scripts internos
  const nonce = headers().get('x-nonce') ?? undefined

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-parchment text-ink antialiased" nonce={nonce}>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
