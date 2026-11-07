'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Banner e abas antigos da campanha. Somem nas telas já redesenhadas, que
 * trazem o próprio cabeçalho (hoje: o Painel do Mestre na raiz da campanha).
 */
export function CromoAntigo({ campaignId, isGM, children }: { campaignId: string; isGM: boolean; children: ReactNode }) {
  const pathname = usePathname()
  const novas = isGM ? [`/campaign/${campaignId}`] : []
  if (novas.includes(pathname)) return null
  return <>{children}</>
}
