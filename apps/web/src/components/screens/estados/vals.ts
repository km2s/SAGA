'use client'

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { dcHref } from '@/lib/dc-routes'

/**
 * SAGA Estados. No app só o estado "Personagens vazio" usa este template
 * (a página inteira de /personagens sem nenhum personagem). O estado
 * "Mensagens: erro ao enviar" vive dentro da própria tela de Mensagens.
 */
export function useEstadosVals() {
  const [talk, setTalk] = useState(false)
  useEffect(() => { const iv = setInterval(() => setTalk(t => !t), 2600); return () => clearInterval(iv) }, [])
  const vazio = () => {}
  return {
    $href: (link: string) => dcHref(link, {}),
    importarHref: '/personagens?importar=1',
    falando: talk,
    temAbas: false, tabs: [] as { l: string; icon: LucideIcon; on: boolean; go: () => void; color: string; line: string }[],
    tVazio: true, tErro: false,
    // Campos do estado de Mensagens (não usado aqui).
    offline: false, netL: '', netC: '', net: { on: false, l: '', go: vazio, track: '', knob: '' },
    draft: '', onDraft: vazio, onKey: vazio, send: vazio,
    msgs: [] as { x: string; failed: boolean; st: string; stIcon: LucideIcon; stC: string; anim: string; bg: string; color: string; ring: string; op: number; retry: () => void; drop: () => void }[],
  }
}

export type Vals = ReturnType<typeof useEstadosVals>
