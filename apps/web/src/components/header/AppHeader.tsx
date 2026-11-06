'use client'

import { usePathname } from 'next/navigation'
import { SagaHeader, ativoFromPath, type HeaderCampanha } from './SagaHeader'

// Telas do redesign que trazem um header próprio (Inicio v2, Primeiros Passos,
// Mesa). Entram aqui conforme forem implementadas.
const OWN_HEADER: RegExp[] = []

export function AppHeader({ campanhas, inviteUrl }: { campanhas: HeaderCampanha[]; inviteUrl: string | null }) {
  const pathname = usePathname()
  if (OWN_HEADER.some(r => r.test(pathname))) return null
  return <SagaHeader ativo={ativoFromPath(pathname)} campanhas={campanhas} inviteUrl={inviteUrl} />
}
