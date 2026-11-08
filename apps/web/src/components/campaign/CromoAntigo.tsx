'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Banner e abas antigos da campanha. Somem nas telas já redesenhadas, que
 * trazem o próprio cabeçalho: o Painel do Mestre (raiz, só mestre) e as
 * subpáginas novas (para todos).
 */
export function CromoAntigo({ campaignId, isGM, children }: { campaignId: string; isGM: boolean; children: ReactNode }) {
  const pathname = usePathname()
  const base = `/campaign/${campaignId}`
  const novas = [`${base}/members`, `${base}/npcs`, `${base}/sessions`, `${base}/notes`, base]
  if (novas.includes(pathname) || pathname.startsWith(`${base}/sessions/`) || pathname.startsWith(`${base}/npcs/`)) return null
  return <>{children}</>
}
