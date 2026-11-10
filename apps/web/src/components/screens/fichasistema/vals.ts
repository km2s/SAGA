'use client'

import { dcHref } from '@/lib/dc-routes'
import { safeImageUrl } from '@/lib/safe-url'
import { useFichaSistema, type FichaSistemaDados } from '@/lib/ficha-sistema/montar'
import type { SistemaSpec } from '@/lib/ficha-sistema/spec'

/** SAGA Fichas por Sistema para um personagem (motor em lib/ficha-sistema). */
export function useFichaSistemaVals(d: FichaSistemaDados, spec: SistemaSpec) {
  const v = useFichaSistema(d, spec)
  return {
    ...v,
    $href: (link: string) => dcHref(link, {}),
    img: safeImageUrl(v.img),
    // O design mostra famílias e sistemas para escolher; aqui é a ficha de um personagem.
    mostruario: false, famNote: '', fams: [] as { l: string; icon: typeof v.famIcon; n: number; on: boolean; go: () => void; color: string; line: string }[],
    systems: [] as { n: string; go: () => void; bg: string; color: string; ring: string }[], sysId: d.sistema,
    hasAspects: false, aspects: [] as { k: string; v: string }[], sections: [] as string[],
  }
}

export type Vals = ReturnType<typeof useFichaSistemaVals>
