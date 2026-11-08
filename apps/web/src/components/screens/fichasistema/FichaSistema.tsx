'use client'

import { Template } from './Template'
import { useFichaSistemaVals } from './vals'
import { SPECS } from '@/lib/ficha-sistema/specs'
import type { FichaSistemaDados } from '@/lib/ficha-sistema/montar'

/** O spec sai pelo nome do sistema (lib/ficha-sistema/specs.ts); a página só chama isto se ele existir. */
export function FichaSistema({ dados }: { dados: FichaSistemaDados }) {
  return <Template v={useFichaSistemaVals(dados, SPECS[dados.sistema]!)} />
}
