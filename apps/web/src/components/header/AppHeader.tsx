'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SagaHeader, ativoFromPath, type HeaderCampanha } from './SagaHeader'

// Telas do redesign que trazem um header próprio (Inicio v2, Primeiros Passos,
// Mesa). Entram aqui conforme forem implementadas.
const OWN_HEADER: RegExp[] = []
/** A tela Mensagens avisa quando lê uma conversa (o selo atualiza na hora). */
export const MENSAGENS_LIDAS = 'saga:mensagens-lidas'

export function AppHeader({ campanhas, inviteUrl }: { campanhas: HeaderCampanha[]; inviteUrl: string | null }) {
  const pathname = usePathname()
  // Selo de não lidas: GET /api/mensagens/lido a cada minuto e ao trocar de página.
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let vivo = true
    const ler = () => { void fetch('/api/mensagens/lido').then(r => (r.ok ? r.json() : null)).then((j: { total?: number } | null) => { if (vivo && j) setUnread(j.total ?? 0) }).catch(() => null) }
    ler()
    const iv = setInterval(ler, 60_000)
    window.addEventListener(MENSAGENS_LIDAS, ler)
    return () => { vivo = false; clearInterval(iv); window.removeEventListener(MENSAGENS_LIDAS, ler) }
  }, [pathname])
  if (OWN_HEADER.some(r => r.test(pathname))) return null
  return <SagaHeader ativo={ativoFromPath(pathname)} campanhas={campanhas} inviteUrl={inviteUrl} unread={unread} />
}
